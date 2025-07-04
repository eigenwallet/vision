## What is the _eigenweb_?

- The _eigenweb_ is a message relaying system. Its participants are the users of the _eigenwallet_.
- It stores and relays data packets. Not all data packets are created equal. Some are stored for just a few hours, others might be stored for months.
- Storage is an expensive good. The amount of storage any given _eigenwallet_ allocates for data packets from a specific other _eigenwallet_ user depends on the _trust score_ it computes for that user.

The _trust score_ is computed using the _eigentrust_ algorithm. It operates under the basic principle of "I extend trust to those who are trusted by people I already trust". As more trust is gained in a relationship between two _eigenwallets_, the storage capacity increases.

The users of the _eignewallet_ can manually add other users they know to be fairly trustworthy. These can be users that are well known in the community or someone the user knows personally.

If a user does an successful _atomic swap_ with another user, it will trust that user more.

The _eigenweb_ works on an _best effort_ basis. Malicious peers cannot do any harm other than utilizing their full storage capacity (not more than a few kilobytes).

Data packets are fully end-to-end encrypted. All connections in the _eigenweb_ operate _within_ the Tor network. Each user gets theirs own _hidden service_. Inbound and outbound connections are therefore fully anonymous.