## Fix
```bash
ssh app01
ls -ld /tmp /srv/drop        # drwxrwxrwt vs drwxrwxrwx
sudo chmod +t /srv/drop      # or: chmod 1777
```

## How it works
Deleting a file is a write to the *directory*, not the file. With mode 777 anyone with write on the directory can remove any
entry. The **sticky bit** (`t`, octal 1000) restricts unlink/rename to the file's owner, the directory's owner, or root.

The three special bits: setuid (4000), setgid (2000), sticky (1000).
