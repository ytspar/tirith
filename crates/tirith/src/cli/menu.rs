//! Launcher for the interactive terminal menus used by the shell integrations.
//!
//! The menus themselves are the Ink app in `tui/` (built as `tirith-menu`), because a
//! reactive TUI is a much better fit for React/Ink than for a gate that must stay
//! dependency-light. This subcommand exists so shell glue only has to know about one
//! binary: it resolves the menu binary, forwards the arguments, inherits the terminal
//! and returns whatever exit code the TUI produced.
//!
//! Resolution order: `TIRITH_MENU_BIN`, then a `tirith-menu` next to this executable,
//! then `tirith-menu` on `PATH`. The TUI keeps stdout clean for its one-line decision,
//! so capturing stdout (`decision=$(tirith menu block ...)`) works here too.

use std::path::{Path, PathBuf};
use std::process::Command;

/// The decision format the TUI should emit on stdout.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MenuEmit {
    Json,
    Zsh,
}

impl MenuEmit {
    fn as_arg(self) -> &'static str {
        match self {
            Self::Json => "json",
            Self::Zsh => "zsh",
        }
    }
}

/// What the caller wants the user to decide.
pub enum MenuRequest {
    Block {
        command: String,
        reason: Option<String>,
        suggestion: Option<String>,
        log_path: Option<String>,
        emit: MenuEmit,
    },
    Stuck {
        cwd: String,
        emit: MenuEmit,
    },
}

/// Run the requested menu, returning the process exit code to report.
pub fn run_menu(request: MenuRequest) -> i32 {
    let binary = match resolve_menu_binary() {
        Ok(path) => path,
        Err(message) => {
            eprintln!("tirith: {message}");
            return 127;
        }
    };
    let mut command = Command::new(&binary);
    match &request {
        MenuRequest::Block {
            command: blocked,
            reason,
            suggestion,
            log_path,
            emit,
        } => {
            command.arg("block").arg("--cmd").arg(blocked);
            if let Some(reason) = reason {
                command.arg("--reason").arg(reason);
            }
            if let Some(suggestion) = suggestion {
                command.arg("--suggest").arg(suggestion);
            }
            if let Some(log_path) = log_path {
                command.arg("--log-path").arg(log_path);
            }
            command.arg("--emit").arg(emit.as_arg());
        }
        MenuRequest::Stuck { cwd, emit } => {
            command
                .arg("stuck")
                .arg("--cwd")
                .arg(cwd)
                .arg("--emit")
                .arg(emit.as_arg());
        }
    }
    match command.status() {
        Ok(status) => status.code().unwrap_or(1),
        Err(error) => {
            eprintln!("tirith: failed to run {}: {error}", binary.display());
            1
        }
    }
}

/// Locate the menu binary, honouring the override used by development checkouts.
fn resolve_menu_binary() -> Result<PathBuf, String> {
    let current_exe = std::env::current_exe().ok();
    resolve_menu_binary_with(
        std::env::var_os("TIRITH_MENU_BIN").map(PathBuf::from),
        current_exe.as_deref(),
        std::env::var_os("PATH"),
    )
}

fn resolve_menu_binary_with(
    override_bin: Option<PathBuf>,
    current_exe: Option<&Path>,
    path_var: Option<std::ffi::OsString>,
) -> Result<PathBuf, String> {
    if let Some(candidate) = override_bin {
        if candidate.is_file() {
            return Ok(candidate);
        }
        return Err(format!(
            "TIRITH_MENU_BIN points at {}, which is not a file",
            candidate.display()
        ));
    }
    if let Some(dir) = current_exe.and_then(Path::parent) {
        let sibling = dir.join(menu_binary_name());
        if is_executable_file(&sibling) {
            return Ok(sibling);
        }
    }
    if let Some(path_var) = path_var {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join(menu_binary_name());
            if is_executable_file(&candidate) {
                return Ok(candidate);
            }
        }
    }
    Err(format!(
        "the interactive menu ({}) is not installed; install it from the tui/ directory \
         or point TIRITH_MENU_BIN at it",
        menu_binary_name()
    ))
}

fn menu_binary_name() -> &'static str {
    if cfg!(windows) {
        "tirith-menu.cmd"
    } else {
        "tirith-menu"
    }
}

fn is_executable_file(path: &Path) -> bool {
    let Ok(metadata) = std::fs::metadata(path) else {
        return false;
    };
    if !metadata.is_file() {
        return false;
    }
    #[cfg(unix)]
    return {
        use std::os::unix::fs::PermissionsExt;
        metadata.permissions().mode() & 0o111 != 0
    };
    #[cfg(not(unix))]
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    fn script(dir: &Path, name: &str) -> PathBuf {
        let path = dir.join(name);
        std::fs::write(&path, "#!/bin/sh\nexit 0\n").expect("write script");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755))
                .expect("chmod script");
        }
        path
    }

    #[test]
    fn override_wins_over_sibling_and_path() {
        let temp = tempfile::tempdir().expect("tempdir");
        let override_bin = script(temp.path(), "custom-menu");
        let sibling_dir = tempfile::tempdir().expect("tempdir");
        let sibling = script(sibling_dir.path(), menu_binary_name());
        let exe = sibling_dir.path().join("tirith");
        let resolved = resolve_menu_binary_with(
            Some(override_bin.clone()),
            Some(&exe),
            Some(std::ffi::OsString::from(sibling_dir.path())),
        )
        .expect("resolves");
        assert_eq!(resolved, override_bin);
    }

    #[test]
    fn falls_back_to_a_sibling_binary_then_path() {
        let temp = tempfile::tempdir().expect("tempdir");
        let exe_dir = temp.path().join("bin");
        std::fs::create_dir_all(&exe_dir).expect("mkdir");
        let exe = exe_dir.join("tirith");
        let sibling = script(&exe_dir, menu_binary_name());
        let resolved = resolve_menu_binary_with(None, Some(&exe), None).expect("resolves");
        assert_eq!(resolved, sibling);

        let path_dir = tempfile::tempdir().expect("tempdir");
        let on_path = script(path_dir.path(), menu_binary_name());
        let resolved = resolve_menu_binary_with(
            None,
            Some(&temp.path().join("elsewhere/tirith")),
            Some(path_dir.path().as_os_str().to_owned()),
        )
        .expect("resolves");
        assert_eq!(resolved, on_path);
    }

    #[test]
    fn a_missing_override_is_an_error_rather_than_a_silent_fallback() {
        let temp = tempfile::tempdir().expect("tempdir");
        let error = resolve_menu_binary_with(Some(temp.path().join("nope")), None, None)
            .expect_err("must fail");
        assert!(error.contains("TIRITH_MENU_BIN"), "{error}");
    }

    #[test]
    fn nothing_found_explains_how_to_install_it() {
        let temp = tempfile::tempdir().expect("tempdir");
        let error = resolve_menu_binary_with(None, None, Some(std::ffi::OsString::new()))
            .expect_err("must fail");
        assert!(error.contains("tui/"), "{error}");
    }
}
