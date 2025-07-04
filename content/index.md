# **eigenwallet**

## Abstract

**_eigenwallet_** is an ambitious community effort to build the Monero wallet for the future.

It was previously known as _UnstoppableSwap_.

https://github.com/eigenwallet/wallet

---

## What?

**_eigenwallet_** is an ambitious effort to combine the frontier of crypto privacy technology in a neat user-friendly packaging and make it accessible to all.

- _eigenwallet_ is a self-custody Monero and Bitcoin wallet
- _eigenwallet_ is a battle-tested ($>3$ years) Monero $\leftrightarrow$ Bitcoin atomic swap implementation
- _eigenwallet_ provides network privacy with its first-class Tor support (using arti^[10])
- _eigenwallet_ is platform-agnostic and works on Windows, Linux, macOS, iOS and Android
- _eigenwallets_ form a peer-to-peer network between its users which we call the [_eigenweb_](eigenweb.html).
  - the _eigenweb_ assigns a local trust score to each _peer_ using the _eigentrust_ system^[9]
  - the _eigenweb_ is a lightweight message relaying system
  - the _eigenweb_ transfers data packets for atomic swaps
  - the _eigenweb_ is not a blockchain and has no coin
- _eigenwallet_ magically syncs itself across different devices using a protocol called _eigensync_.
  - _eigensync_ allows you to:
    - perform blockchain synchronization just once on one device, and then share that wallet state across all your other devices
    - start a swap on one device and then complete it on another
    - outsource the expensive blockchain synchronization to a trusted party
    - outsource the expensive blockchain synchronization to your home server
  - _eigensync_ uses a _conflict-free replicated data type_^[11] that is split into state packets and stored on multiple devices
  - _eigensync_ is fully private and anonymous. State packets are encrypted with the users private key
- _eigenwallet_ can be a Monero node (using cuprate^[12])

## Why "_eigenwallet_"?

- "eigen" means "to own" in german, emphasizing the self-ownership and self-custody you hold over your funds when using _eigenwallet_
- "eigen" is a prefix used for mathematical concepts (like eigenvalues and eigenvectors). Crypto and math are intrinstrically intertwined
- we use an algorithm called _eigentrust_ to build a decentralized trust system and assign a local trust score to each _peer_
- we think it sounds cool

## Why?

To understand what we are building (and why) we must hold a few truths to be non-negotiable.

**(1)** The primary use case for crypto is to be:

- peer-to-peer electronic cash^[1]
- a system to store, hold and transfer value irrespective of borders and governments

**(2)** Bitcoin is the most prominent attempt at establishing such a system. Having gained widespread acceptance, it is here to stay for a while. It will continue to be acquirable to most people on this planet for the foreseeable future.

**(3)** Privacy is the most important aspect of any peer-to-peer electronic cash system. Without it fungibility cannot be achieved. Bitcoin's public ledger severely lacks in this regard.

**(4)** Monero is currently the best attempt at a better system. It is the best choice because it:

- offers reasonably private transactions through ring signatures and bulletproofs^[2]
- enforces non-transparent uniform transactions
- has the largest user base of any privacy coin (by far), giving it the largest possible anonymity set^[4]
- has gained widespread adoption in circles where privacy is paramount^[5]
- has been chosen most valuable by the market^[8]
- has shown to be eager and willing to adopt new technology (e.g FCMP++)^[3]

**(5)** Monero is under constant attack. It lives under the constant threat of delistings. It is not unreasonable to assume that it will be banned from most exchanges within the next 3-5 years^[6].

**(6)** We cannot rely on centralized exchanges. Governments will continue to crack down against Monero^[7]. Centralized entities will fold under pressure because they do not want to go to prison, and they need to stay profitable. This will impact the ability to onboard new users to the network if the community does not develop a reliable onramp that does not rely on the continued functioning of these institutions.

Therefore any onramp **must**:

- be non-custodial (meaning users do not give up access to their private keys)
- be censorship resistant (meaning it does not rely on a central authority)
- provide radical privacy (both on the protocol and network level)
- have high liquidity (comparable to centralized exchanges)

The goal of _eigenwallet_ is to build exactly that onramp. In the process we will be building a great wallet as well.

## References

[1]: Nakamoto, Satoshi. "Bitcoin: A Peer-to-Peer Electronic Cash System." https://bitcoin.org/bitcoin.pdf. October 31, 2008.

[2]: koe, Kurt M. Alonso, Sarang Noether. "Zero to Monero: Second Edition - A Technical Guide to a Private Digital Currency; for Beginners, Amateurs, and Experts." https://www.getmonero.org/library/Zero-to-Monero-2-0-0.pdf. April 4, 2020.

[3]: kayabaNerve. "Full-Chain Membership Proofs + Spend Authorization + Linkability." https://gist.github.com/kayabaNerve/0e1f7719e5797c826b87249f21ab6f86. _"This proposes an extension to FCMPs to make them a drop-in replacement for the existing CLSAG. In order to be such a replacement, the proof must handle membership (inherent to FCMPs), spend authorization, and linkability."_

[4]: BitInfoCharts. "Monero, Zcash Transactions historical chart - Number of transactions in blockchain per day." https://bitinfocharts.com/comparison/transactions-xmr-zec.html. Historical transaction data demonstrating Monero's significantly higher daily transaction volume compared to other privacy-focused cryptocurrencies.

[5]: Chainalysis Team. "Darknet market and fraud shop BTC revenues decline amid years-long international law enforcement disruption." https://www.chainalysis.com/blog/darknet-markets-2025/. May 16, 2025. _"As international authorities have disrupted DNMs large and small in the last few years, cybercriminals and drug dealers have learned firsthand the consequences of running BTC-accepting DNMs given the currency's inherent transparency. Many operators have since moved to accepting only Monero (XMR), a privacy coin with features designed to boost anonymity and reduce traceability."_

[6]: Evidence of ongoing exchange delistings includes: OKX delisting Monero, Zcash, and Dash (https://cointelegraph.com/news/report-okex-delisting-monero-dash-privacy-cryptos-over-fatf-demands), Upbit delisting privacy coins (https://cointelegraph.com/news/upbit-exchange-delists-privacy-coins-due-to-money-laundering-concerns), BitBay delisting Monero (https://de.cointelegraph.com/news/bitbay-crypto-exchange-to-delist-monero-due-to-money-laundering-concerns), Bittrex delisting privacy coins (https://www.coindesk.com/markets/2021/01/01/bittrex-to-delist-privacy-coins-monero-dash-and-zcash), Kraken restricting Monero for UK customers (https://cointelegraph.com/news/kraken-to-delist-monero-for-uk-customers-by-the-end-of-november), Huobi delisting privacy coins (https://cointelegraph.com/news/huobi-to-delist-monero-and-other-privacy-coins-citing-regulatory-pressures), and Binance temporary delisting threats (https://cointelegraph.com/news/monero-drops-multi-month-lows-binance-delisting). https://support.kraken.com/articles/support-for-monero-xmr-in-europe.

[7]: Regulation (EU) 2024/1624 of the European Parliament and of the Council of 31 May 2024 on the prevention of the use of the financial system for the purposes of money laundering or terrorist financing. https://eur-lex.europa.eu/eli/reg/2024/1624/oj/eng. This comprehensive EU regulation establishes strict anti-money laundering and counter-terrorist financing requirements that significantly impact the regulatory environment for privacy-focused cryptocurrencies and the exchanges that handle them.

[8]: BitInfoCharts. "Monero, Zcash Market Capitalization historical chart." https://bitinfocharts.com/comparison/marketcap-xmr-zec.html. Market capitalization data demonstrates Monero's significantly higher market valuation compared to other major privacy-focused cryptocurrencies, indicating stronger market confidence and adoption.

[9]: Kamvar, Sepandar D., Mario T. Schlosser, and Hector Garcia-Molina. "The EigenTrust Algorithm for Reputation Management in P2P Networks." _Proceedings of the 11th International Conference on World Wide Web_, 2003. https://nlp.stanford.edu/pubs/eigentrust.pdf.

[10]: The Tor Project. "Arti: A Tor implementation in Rust." https://tpo.pages.torproject.net/core/arti/about/. _"Arti is designed from the ground up to work as a modular, embeddable library that other applications can use."_

[11]: Wikipedia contributors. "Conflict-free replicated data type." _Wikipedia, The Free Encyclopedia_. https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type. _"In distributed computing, a conflict-free replicated data type (CRDT) is a data structure that is replicated across multiple computers in a network, with the following features: The application can update any replica independently, concurrently and without coordinating with other replicas."_

[12]: Cuprate. "Cuprate: An upcoming experimental, modern, and secure Monero node." https://cuprate.org/. _"Discover the documentation of our Rust-written project, as well as documentation on monerod and the Monero protocol."_