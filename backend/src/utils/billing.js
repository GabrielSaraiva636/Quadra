function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function roundUpToWholeReal(value) {
  return toMoney(Math.ceil(Number(value || 0)));
}

function calculatePlayerShare(totalGameValue, payingPlayersCount) {
  const players = Math.max(1, Number(payingPlayersCount || 1));
  const raw = Number(totalGameValue || 0) / players;
  return roundUpToWholeReal(raw);
}

function calculateCustomerDebt({
  totalConsumed = 0,
  totalPaid = 0,
  totalGameValue = 0,
  payingPlayersCount = 1,
  isPayingPlayer = false
}) {
  const consumed = toMoney(totalConsumed);
  const paid = toMoney(totalPaid);
  const gameShare = isPayingPlayer ? calculatePlayerShare(totalGameValue, payingPlayersCount) : 0;
  const totalAccount = toMoney(consumed + gameShare);
  const pending = toMoney(Math.max(0, totalAccount - paid));

  return {
    totalConsumed: consumed,
    totalPaid: paid,
    gameShare,
    totalAccount,
    pending
  };
}

module.exports = {
  toMoney,
  roundUpToWholeReal,
  calculatePlayerShare,
  calculateCustomerDebt
};
