const labels = {
  elite: "Elite Trader",
  trusted: "Trusted Seller",
  safe: "Escrow Safe",
  unverified: "Unverified",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export default function TrustBadge({ level = "unverified" }) {
  const normalizedLevel = labels[level] ? level : "unverified";

  return (
    <span className={`trust-badge ${normalizedLevel}`}>
      {labels[normalizedLevel]}
    </span>
  );
}