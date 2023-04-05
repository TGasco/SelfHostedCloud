#!/usr/bin/env python3

"""
This script automatically sets up the environment for a web app by installing the required
dependencies (node.js and MongoDB) on the user's machine. It works on Linux, macOS, and Windows.
On macOS, it also installs Homebrew if it's not already installed.
"""

import os
import sys
import subprocess
import shutil
import platform
import shlex
from typing import List

hasUsedBrew = False

def run_command(command: List[str]) -> None:
    """
    Run a shell command and print its output.

    Args:
        command (List[str]): The command to run, split into a list of arguments.

    Returns:
        None
    """
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()

    if stdout:
        print(stdout.decode("utf-8").strip())
    if stderr:
        print(stderr.decode("utf-8").strip())

def install_pip() -> None:
    """
    Install pip if it's not already installed.

    Returns:
        None
    """
    if not shutil.which("pip"):
        print("Installing pip...")
        run_command(["curl", "https://bootstrap.pypa.io/get-pip.py", "-o", "get-pip.py"])
        run_command(["python", "get-pip.py"])
        os.remove("get-pip.py")
    else:
        print("pip is already installed.")


def install_requests() -> None:
    """
    Install requests library using pip if it's not already installed.

    Returns:
        None
    """
    try:
        import requests
    except ImportError:
        print("Installing requests library...")
        run_command(["pip", "install", "requests"])


def install_homebrew() -> None:
    """
    Install Homebrew on macOS if it's not already installed.

    Returns:
        None
    """
    if not shutil.which("brew"):
        print("Installing Homebrew...")
        run_command(["/bin/bash", "-c", "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"])
    else:
        print("Homebrew is already installed.")

def brew_cleanup() -> None:
    """
    Cleanup Homebrew on macOS.

    Returns:
        None
    """
    run_command(["brew", "cleanup"])


def install_nodejs() -> None:
    """
    Install node.js if it's not already installed.

    Returns:
        None
    """
    if not shutil.which("node"):
        print("Installing node.js...")

        if sys.platform == "darwin":
            run_command(["brew", "install", "node"])
            hasUsedBrew = True
        elif sys.platform == "linux":
            # Check for admin privileges
            if not is_admin():
                elevate_privileges_windows()
            run_command(["curl", "-fsSL", "https://deb.nodesource.com/setup_lts.x", "|", "sudo", "-E", "bash", "-"])
            run_command(["sudo", "apt-get", "install", "-y", "nodejs"])
        elif sys.platform == "win32":
            import requests
            # Check for admin privileges
            if not is_admin():
                elevate_privileges_windows()
            nodejs_url = "https://nodejs.org/dist/v16.14.0/node-v16.14.0-x64.msi"
            response = requests.get(nodejs_url)
            with open("nodejs_installer.msi", "wb") as file:
                file.write(response.content)

            print("Installing node.js...")
            run_command(["msiexec", "/i", "nodejs_installer.msi", "/quiet", "/norestart"])
            os.remove("nodejs_installer.msi")
        else:
            raise ValueError("Unsupported platform.")
    else:
        print("node.js is already installed.")


def install_mongodb() -> None:
    """
    Install MongoDB if it's not already installed.

    Returns:
        None
    """
    if not shutil.which("mongo") and not shutil.which("mongod"):
        print("Installing MongoDB...")

        if sys.platform == "darwin":
            run_command(["brew", "tap", "mongodb/brew"])
            run_command(["brew", "install", "mongodb-community"])
            run_command(["brew", "services", "restart", "mongodb/brew/mongodb-community"])
            hasUsedBrew = True
        elif sys.platform == "linux":
            # Check for admin privileges
            if not is_admin():
                elevate_privileges_windows()
            run_command(["wget", "-qO", "-", "https://www.mongodb.org/static/pgp/server-5.0.asc", "|", "sudo", "apt-key", "add", "-"])
            run_command(["echo", "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse", "|", "sudo", "tee", "/etc/apt/sources.list.d/mongodb-org-5.0.list"])
            run_command(["sudo", "apt-get", "update"])
            run_command(["sudo", "apt-get", "install", "-y", "mongodb-org"])
        elif sys.platform == "win32":
            import requests
            # Check for admin privileges
            if not is_admin():
                elevate_privileges_windows()
            mongodb_url = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-5.0.6-signed.msi"
            response = requests.get(mongodb_url)
            with open("mongodb_installer.msi", "wb") as file:
                file.write(response.content)

            print("Installing MongoDB...")
            run_command(["msiexec", "/i", "mongodb_installer.msi", "/quiet", "/norestart", "INSTALLLOCATION=C:\\Program Files\\MongoDB\\Server\\5.0\\"])
            os.remove("mongodb_installer.msi")
        else:
            raise ValueError("Unsupported platform.")
    else:
        print("MongoDB is already installed.")

# Elevate User Privilages (if required)
def elevate_privileges_linux() -> None:
    """Elevate privileges on Linux using pkexec."""
    os.execvp('pkexec', ['pkexec', sys.executable] + sys.argv)

def elevate_privileges_macos() -> None:
    """Elevate privileges on macOS using osascript."""
    script_args = [shlex.quote(arg) for arg in sys.argv]
    script = ' '.join(script_args)
    osascript_cmd = f'do shell script "{script}" with administrator privileges'
    subprocess.run(['osascript', '-e', osascript_cmd])
    sys.exit(0)

def elevate_privileges_windows() -> None:
    """Elevate privileges on Windows using ctypes and pywin32."""
    import ctypes
    from ctypes import windll

    try:
        import win32com.shell.shell as shell
        ASADMIN = 'asadmin'
        if sys.argv[-1] != ASADMIN:
            script = os.path.abspath(sys.argv[0])
            params = f'"{script}" {ASADMIN}'
            shell.ShellExecuteEx(lpVerb='runas', lpFile=sys.executable, lpParameters=params)
            sys.exit(0)
    except ImportError:
        print("Error: pywin32 is not installed. Please install with 'pip install pywin32'")
        sys.exit(1)


def elevate_privileges() -> None:
    """Elevate privileges using an OS-specific method."""
    host_os = platform.system()

    if host_os == 'Linux':
        elevate_privileges_linux()
    elif host_os == 'Darwin':
        elevate_privileges_macos()
    elif host_os == 'Windows':
        elevate_privileges_windows()
    else:
        print(f"Error: Unsupported operating system ({host_os}).")
        sys.exit(1)

def is_admin() -> bool:
    """Check if the current user is an administrator."""
    if sys.platform == "win32":
        try:
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        except AttributeError:
            return False
    else:
        return os.getuid() == 0

def npm_install(app_path) -> None:
    """
    Install the required npm packages.

    Returns:
        None
    """
    # First, check if node_modules exists if so, skip this
    if not os.path.exists(os.path.join(app_path, "node_modules")):
        print("Installing npm packages...")
        # run_command(["npm", "install"])
        print("npm packages installed.")
    else:
        print("npm packages are already installed.")
        return

def script_is_standalone() -> bool:
    """Check if the script is being run as a standalone executable."""
    return getattr(sys, 'frozen', False)

def main() -> None:
    """
    The main function that runs the environment setup process.

    Returns:
        None
    """
    print("Setting up environment, Please be patient...")
    if sys.platform == "darwin":
        install_homebrew()

    install_nodejs()
    install_mongodb()

    if sys.platform == "darwin" and hasUsedBrew:
        brew_cleanup()

    print("Environment setup complete.")


if __name__ == '__main__':
    main()


