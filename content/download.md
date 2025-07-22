<style>
.notice {
    background-color: rgb(250, 241, 213);
    border: 1px solid #ffeaa7;
    color: #856404;
    padding: 0.75rem;
    text-align: center;
    font-style: italic;
    white-space: wrap !important;
}

@media (max-width: 600px) {
    table {
        font-size: 0.9em;
    }

    .hide-mobile {
        display: none;
    }
}

</style>

### Wallet {{LATEST_VERSION}}

**Recommended for most users.** Pre-compiled binaries for the _eigenwallet_ GUI. Will allow you to store, send and receive Monero. Already supports exchanging Bitcoin $\rightarrow$ Monero using Atomic Swaps.

{{GUI_TABLE}}

### Developer Tools {{LATEST_VERSION}}

Command-line tools for debugging purposes or to run a a maker (to provide liquidity).

{{CLI_TABLE}}

_The release was published on {{RELEASE_DATE}}._ _Read this [guide](https://docs.unstoppableswap.net/getting_started/verify_tauri_signature) to verify the signature of the binaries._

### Flatpak

For Linux systems with Flatpak support, you can install _eigenwallet_ directly from our Flatpak repository.

**Requirements:**
- Flatpak 1.0 or newer
- x86_64 architecture

```sh
# Install
flatpak remote-add --user unstoppableswap https://unstoppableswap.github.io/core/unstoppableswap.flatpakrepo
flatpak install unstoppableswap net.unstoppableswap.gui

# Run
flatpak run net.unstoppableswap.gui

# Update
flatpak update net.unstoppableswap.gui
```

### Arch User Repository (AUR) packages

{{AUR_TABLE}}
