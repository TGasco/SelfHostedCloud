#!/usr/bin/env python3

import os
import sys
import platform
import subprocess
import shutil
import tempfile
import argparse
from typing import Optional
import shlex


class PartitionError(Exception):
    pass


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


def create_partition_linux(size_bytes: int) -> None:
    """Create a new ext4 partition on Linux.

    Args:
        size_bytes: The size of the partition in bytes.
    """
    print("Creating partition on Linux...")

    # Check for required tools
    for cmd in ['parted', 'mkfs.ext4', 'mkdir']:
        if not shutil.which(cmd):
            raise PartitionError(f"{cmd} is not installed.")

    # Replace /dev/sda with the target disk device
    target_disk = '/dev/sda'

    # Convert size_bytes to a percentage of the disk size for parted
    disk_size_bytes = int(subprocess.check_output(['blockdev', '--getsize64', target_disk]))
    size_percentage = (size_bytes / disk_size_bytes) * 100

    # Create partition using parted
    subprocess.run(['parted', target_disk, 'mklabel', 'gpt'], check=True)
    subprocess.run(['parted', target_disk, 'mkpart', 'MyCloudDrive', 'ext4', '0%', f'{size_percentage}%'], check=True)

    # Format partition with ext4
    subprocess.run(['mkfs.ext4', f'{target_disk}1'], check=True)

    # Mount the partition
    mount_point = '/mnt/MyCloudDrive'
    os.makedirs(mount_point)
    subprocess.run(['mount', f'{target_disk}1', mount_point], check=True)


def create_partition_macos(size_bytes: int) -> None:
    """Create a new APFS partition on macOS.

    Args:
        size_bytes: The size of the partition in bytes.
    """
    print("Creating new partition on macOS...")

    # Check for required tools
    if not shutil.which('diskutil'):
        raise PartitionError("diskutil is not installed.")

    # Get the target disk identifier
    diskutil_output = subprocess.check_output(['diskutil', 'list'], text=True)
    target_disk = None
    for line in diskutil_output.splitlines():
        if 'internal' in line and 'physical' in line:
            target_disk = line.split()[0]
            break

    if not target_disk:
        raise PartitionError("Internal physical disk not found.")

    # Convert size_bytes to size_gib for diskutil
    size_gib = size_bytes / (1024 ** 3)

    # Create APFS volume
    subprocess.run(['diskutil', 'apfs', 'addVolume', target_disk, 'APFS', 'MyCloudDrive', f'-size={size_gib}g'], check=True)


def create_partition_windows(size_bytes: int) -> None:
    """Create a new NTFS partition on Windows.

    Args:
        size_bytes: The size of the partition in bytes.
    """
    print("Creating partition on Windows...")

    # Check for required tools
    if not shutil.which('diskpart'):
        raise PartitionError("diskpart is not installed.")

    # Convert size_bytes to size_mb for diskpart
    size_mb = size_bytes / (1024 ** 2)

    # Diskpart script to create a new partition and assign a drive letter
    diskpart_script = f'''
select disk 0
create partition primary size={size_mb}
format fs=ntfs quick
assign
active
exit
'''

    # Run diskpart with the script
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as temp_script:
        temp_script.write(diskpart_script)
        temp_script.flush()

    subprocess.run([f'"{sys.executable}"', '/s', f'"{temp_script.name}"'], check=True)


def remove_partition_linux() -> None:
    """Remove the ext4 partition on Linux."""
    print("Removing partition on Linux...")

    target_disk = '/dev/sda1'  # Replace with the correct partition name
    mount_point = '/mnt/MyCloudDrive'

    # Unmount the partition
    subprocess.run(['umount', mount_point], check=True)

    # Remove partition using parted
    subprocess.run(['parted', '/dev/sda', 'rm', '1'], check=True)


def remove_partition_macos() -> None:
    """Remove the APFS partition on macOS."""
    print("Removing partition on macOS...")

    # Find the APFS volume
    diskutil_output = subprocess.check_output(['diskutil', 'list'], text=True)
    volume_info = [line for line in diskutil_output.splitlines() if 'MyCloudDrive' in line]

    if not volume_info:
        raise PartitionError("MyCloudDrive not found.")

    target_volume = volume_info[0].split()[-1]

    # Remove the APFS volume
    subprocess.run(['diskutil', 'apfs', 'deleteVolume', target_volume], check=True)


def remove_partition_windows() -> None:
    """Remove the NTFS partition on Windows."""
    print("Removing partition on Windows...")

    # Find the target volume
    wmic_output = subprocess.check_output(['wmic', 'logicaldisk', 'get', 'name,volumename'], text=True)
    target_volume = [line.split(':')[0] for line in wmic_output.splitlines() if 'MyCloudDrive' in line]

    if not target_volume:
        raise PartitionError("MyCloudDrive not found.")

    # Diskpart script to remove the partition
    diskpart_script = f'''
                    select volume {target_volume[0]}
                    delete volume
                    exit
                    '''
        # Run diskpart with the script
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as temp_script:
        temp_script.write(diskpart_script)
        temp_script.flush()

    subprocess.run(['diskpart', '/s', temp_script.name], check=True)


def main() -> None:
    """Parse command-line arguments, elevate privileges, and create or remove the partition."""
    parser = argparse.ArgumentParser(description="Create or remove a partition named 'MyCloudDrive'")
    parser.add_argument('action', choices=['create', 'remove'], help='action to perform (create or remove)')
    parser.add_argument('--size', type=int, help='size of the partition in bytes (for create action)')

    args = parser.parse_args()

    if args.action == 'create' and not args.size:
        parser.error("the '--size' argument is required when creating a partition")

    if os.geteuid() != 0:
        print("Requesting administrator/root privileges...")
        elevate_privileges()

    host_os = platform.system()

    try:
        if host_os == 'Linux':
            if args.action == 'create':
                create_partition_linux(args.size)
            else:
                remove_partition_linux()
        elif host_os == 'Darwin':
            if args.action == 'create':
                create_partition_macos(args.size)
            else:
                remove_partition_macos()
        elif host_os == 'Windows':
            if args.action == 'create':
                create_partition_windows(args.size)
            else:
                remove_partition_windows()
        else:
            raise PartitionError(f"Unsupported operating system ({host_os}).")

        print(f"Partition 'MyCloudDrive' {args.action}d successfully.")

    except (subprocess.CalledProcessError, PartitionError) as e:
        print(f"Error: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()


