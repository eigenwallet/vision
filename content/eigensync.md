## What is _eigensync_?

- It's a protocol developed just for the _eigenwallet_.
- It synchronizes that state across different devices with the same seed.
- It uses a _conflict-free replicated data structure_^[1] that is split into
  state packets and stored on multiple devices
- It is fully private and anonymous. State packets are encrypted with the users
  private key

## What can it do?

It allows us to do cool stuff like:

- Perform blockchain synchronization once on your laptop. Open the same wallet
  on your iPhone. <br>You will immediately see the full wallet balance,
  compltely skipping the painful sync process.
- Initiate an _atomic swap_ on your iPhone. Lock your Bitcoin. Resume it later
  on your laptop when the other party has locked their Monero.
- Restore a Monero wallet after a year of inactivity on a new device. You forgot
  the restore height. You enter your seed and the wallet fully syncs within
  seconds.
- You have a server at home which you use to run a _Monero node_. You install
  the _eigennode_ on the same machine. The _eigennode_ does the heavy lifting of
  scanning the entire blockchain for your transactions. Your iPhone connects to
  it and you get _MyMonero_ like ease of use but with complete privacy.

## References

[1]: Wikipedia contributors. "Conflict-free replicated data type." _Wikipedia,
The Free Encyclopedia_.
https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type. _"In
distributed computing, a conflict-free replicated data type (CRDT) is a data
structure that is replicated across multiple computers in a network, with the
following features: The application can update any replica independently,
concurrently and without coordinating with other replicas."_
