import BuyerEscrowView from "./BuyerEscrowView";

export default function OrderStatusTracking({
  order,
  onBackToMarketplace,
  onBuyerConfirmReceipt,
}) {
  return (
    <BuyerEscrowView
      order={order}
      onBack={onBackToMarketplace}
      onConfirmed={onBuyerConfirmReceipt}
    />
  );
}
