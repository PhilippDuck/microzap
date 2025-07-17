export const articles = [
  {
    id: 1,
    title: "Einführung in Bitcoin: Die erste Kryptowährung",
    description:
      "Erfahren Sie, wie Bitcoin 2009 von Satoshi Nakamoto als erste dezentrale Kryptowährung eingeführt wurde und welche Rolle die Blockchain spielt. Ein Überblick über seine Grundlagen und Herausforderungen.",
    fullContent:
      "Bitcoin, von dem pseudonymen Satoshi Nakamoto 2008 in einem Whitepaper vorgestellt und 2009 gestartet, gilt als die erste dezentrale Kryptowährung. Es basiert auf einer Blockchain-Technologie, die Transaktionen in Blöcken speichert, die durch kryptografische Hashes gesichert sind. Das Netzwerk funktioniert ohne zentrale Autorität, wobei Miner durch Proof-of-Work Transaktionen validieren und Belohnungen in Form von Bitcoin erhalten. Dieses System wurde als Antwort auf die Finanzkrise 2008 entwickelt, um ein peer-to-peer-Zahlungssystem ohne Banken zu ermöglichen. Doch Bitcoin hat Einschränkungen: Die Blockgröße von etwa 1 MB limitiert die Kapazität auf etwa 7 Transaktionen pro Sekunde, was zu Verzögerungen und hohen Gebühren führt, insbesondere bei hoher Nachfrage. Diese Skalierbarkeitsproblematik hat die Entwicklung von Layer-2-Lösungen wie dem Lightning Network angestoßen, das Off-Chain-Transaktionen ermöglicht. Bitcoin bleibt dennoch ein Pionier, der das Vertrauen in dezentrale Systeme etabliert hat, und dient als Grundlage für innovative Anwendungen wie Mikrozahlungen, die in diesem Projekt untersucht werden.",
    date: "2025-07-15",
    author: "Satoshi Nakamoto",
    image: "/path/to/image1.jpg", // Ersetze mit tatsächlichem Bildpfad oder URL
    type: "free",
  },
  {
    id: 2,
    title: "Die Bitcoin Blocksize Wars: Ein historischer Konflikt",
    description:
      "Tauchen Sie ein in die Blocksize Wars (2015-2017), den Konflikt zwischen Big Blockers und Small Blockers, der Bitcoin prägte und zur SegWit-Entwicklung führte.",
    fullContent:
      'Die sogenannten Blocksize Wars zwischen 2015 und 2017 markierten einen entscheidenden Wendepunkt in der Geschichte von Bitcoin. Der Konflikt entzündete sich an der Frage, wie die Blockgröße angepasst werden sollte, um die Transaktionskapazität zu erhöhen. Die "Big Blockers" argumentierten, dass größere Blöcke die Skalierbarkeit verbessern und Bitcoin für alltägliche Zahlungen nutzbar machen könnten, während die "Small Blockers" betonten, dass dies die Dezentralität gefährde, da nur wenige leistungsstarke Nodes mithalten könnten. Dieser Streit führte zu intensiven Debatten, Hard-Fork-Vorschlägen wie Bitcoin XT und Bitcoin Unlimited sowie der Einführung von SegWit (Segregated Witness), das die effektive Blockgröße erhöhte, ohne das Limit zu ändern. Die Spaltung kulminierte in der Entstehung von Bitcoin Cash im August 2017. Die Wars unterstrichen den Bedarf an alternativen Skalierungslösungen wie dem Lightning Network, das Off-Chain-Transaktionen ermöglicht, ohne die Basis-Blockchain zu belasten. Dieser historische Kontext ist entscheidend, um die technische Evolution von Bitcoin zu verstehen.',
    date: "2025-07-16",
    author: "Andreas Antonopoulos",
    image: "/path/to/image2.jpg",
    type: "premium",
  },
  {
    id: 3,
    title: "Wie das Lightning Network die Bitcoin-Skalierbarkeit verbessert",
    description:
      "Lernen Sie, wie das Lightning Network als Layer-2-Lösung die Skalierbarkeit von Bitcoin steigert und Off-Chain-Transaktionen ermöglicht.",
    fullContent:
      "Das Lightning Network, von Joseph Poon und Thaddeus Dryja 2016 vorgeschlagen, stellt eine Layer-2-Lösung dar, die die Skalierbarkeit von Bitcoin erheblich verbessert. Es ermöglicht Off-Chain-Transaktionen über Zahlungskanäle, die zwischen Parteien eingerichtet werden, wodurch Transaktionen nicht sofort auf der Blockchain bestätigt werden müssen. Dies reduziert die Belastung des Bitcoin-Netzwerks und erlaubt theoretisch Millionen von Transaktionen pro Sekunde bei nahezu null Gebühren. Der Mechanismus basiert auf Multisig-Transaktionen, die einen Kanal eröffnen und schließen, wobei alle Zwischen-Transaktionen nur lokal abgewickelt werden. Diese Eigenschaft macht es besonders geeignet für Mikrozahlungen, wie sie in digitalen Plattformen wie News-Blogs genutzt werden könnten. Dennoch gibt es Herausforderungen: Die Verwaltung von Kanälen erfordert Liquidität, und die Sicherheit hängt von der korrekten Implementierung ab. Die Arbeit dieses Prototyps zielt darauf ab, diese Technologie praktisch zu demonstrieren und ihre Machbarkeit zu evaluieren.",
    date: "2025-07-17",
    author: "Joseph Poon",
    image: "/path/to/image3.jpg",
    type: "free",
  },
  {
    id: 4,
    title: "Mikrozahlungen mit Lightning: Ein neues Wirtschaftsmodell",
    description:
      "Erfahren Sie, wie Mikrozahlungen mit Lightning neue Modelle für digitale Inhalte ermöglichen und welche Herausforderungen dabei auftreten.",
    fullContent:
      "Das Lightning Network eröffnet neue wirtschaftliche Möglichkeiten durch die Unterstützung von Mikrozahlungen, die so klein wie 1 Satoshi (0.00000001 BTC) sein können. Im Vergleich zu traditionellen Zahlungssystemen wie PayPal oder Kreditkarten, die Gebühren von 2-3% erheben, ermöglicht LN Transaktionen mit nahezu null Kosten, was Pay-per-Use-Modelle für digitale Inhalte wie Artikel oder Videos realistisch macht. Dies könnte den Nachrichtenmarkt revolutionieren, indem es Content-Creators erlaubt, direkt von Lesern zu profitieren, ohne Abhängigkeit von Werbung oder Abonnements. Allerdings bringt die Implementierung Herausforderungen mit sich, darunter die Notwendigkeit, Benutzer über Wallet-Nutzung aufzuklären und die Stabilität der Zahlungskanäle zu gewährleisten. Dieser Prototyp untersucht, wie eine Webapplikation mit React und Node.js diese Technologie integrieren kann, um ein praktikables Beispiel zu liefern und die Machbarkeit zu beweisen.",
    date: "2025-07-14",
    author: "Elmedin Kudusic",
    image: "/path/to/image4.jpg",
    type: "premium",
  },
  {
    id: 5,
    title: "Lightning Network Adoption in Entwicklungsländern",
    description:
      "Entdecken Sie, wie das Lightning Network in Afrika und anderen Regionen ohne funktionierende Bankensysteme eingesetzt wird.",
    fullContent:
      "In Entwicklungsländern, insbesondere in Afrika, wo traditionelle Bankensysteme oft unzuverlässig oder unzugänglich sind, bietet das Lightning Network eine vielversprechende Alternative. Projekte wie BitPesa und andere Pilotprogramme nutzen LN, um mobile Zahlungen zu ermöglichen, die unabhängig von zentralen Institutionen funktionieren. Die nahezu kostenlosen Transaktionen und die Schnelligkeit machen es besonders attraktiv, insbesondere in ländlichen Gebieten mit begrenzter Internetanbindung. Dennoch stehen Hindernisse im Weg: Regulierungsunsicherheiten und die Notwendigkeit, Benutzer über die Technologie aufzuklären, könnten die breite Adaption verzögern. Dieser Artikel beleuchtet die aktuellen Anwendungen und die potenziellen Auswirkungen auf die finanzielle Inklusion, wobei die Ergebnisse dieses Prototyps dazu beitragen könnten, solche Szenarien zu simulieren.",
    date: "2025-07-18",
    author: "Jane Doe",
    image: "/path/to/image5.jpg",
    type: "free",
  },
  {
    id: 6,
    title: "Vermögenssicherung mit Lightning in autoritären Staaten",
    description:
      "Lernen Sie, wie das Lightning Network in autoritären Regimen Vermögen schützt, beispielsweise bei den kanadischen Trucker-Protesten 2022.",
    fullContent:
      "In autoritären Staaten bietet das Lightning Network eine Möglichkeit, Vermögen vor Zensur und Beschlagnahmung zu schützen, da es auf der dezentralen Natur von Bitcoin basiert. Während traditionelle Bankkonten leicht eingefroren werden können, ermöglicht LN schnelle, schwer nachverfolgbare Transaktionen. Ein prominentes Beispiel sind die kanadischen Trucker-Proteste 2022, bei denen Aktivisten Bitcoin und LN nutzten, um Spenden zu sammeln, nachdem Banken Konten sperrten. Diese Anwendung zeigt das geopolitische Potenzial, insbesondere in Ländern mit repressiven Regimen. Allerdings erfordert der Einsatz technisches Wissen und eine stabile Internetverbindung, was die Verbreitung einschränken könnte. Dieser Artikel untersucht diese Aspekte und wie der Prototyp solche Szenarien simulieren kann.",
    date: "2025-07-19",
    author: "John Smith",
    image: "/path/to/image6.jpg",
    type: "premium",
  },
];
