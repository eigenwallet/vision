### Flatpak

For Linux systems with Flatpak support, you can install _eigenwallet_ directly from our Flatpak repository.

**Requirements:**
- Flatpak 1.0 or newer
- x86_64 architecture

```sh
# Install
flatpak remote-add --if-not-exists unstoppableswap https://flatpak.eigenwallet.org/unstoppableswap.flatpakrepo
flatpak install unstoppableswap net.unstoppableswap.gui

# Run
flatpak run net.unstoppableswap.gui

# Update
flatpak update net.unstoppableswap.gui
```
