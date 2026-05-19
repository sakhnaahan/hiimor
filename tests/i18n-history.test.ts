import assert from "node:assert/strict";
import test from "node:test";
import {
  betTypeLabel,
  getTranslations,
  historyResultLabel,
  transactionTypeLabel,
} from "@/lib/i18n";

test("history translations use simpler Mongolian labels", () => {
  const t = getTranslations("mn");

  assert.equal(t.pendingBets, "Хариу гараагүй таавар");
  assert.equal(t.raceHistory, "Тааврын түүх");
  assert.equal(t.transactionHistory, "Коины орлого, зарлага");
  assert.equal(t.picked, "Сонгосон морь");
  assert.equal(t.bet, "Тавьсан дүн");
  assert.equal(t.winner, "Түрүүлсэн морь");
  assert.equal(t.time, "Огноо");
  assert.equal(t.result, "Үр дүн");
});

test("history result labels map stored values to plain Mongolian", () => {
  assert.equal(historyResultLabel("mn", "WIN"), "Хожсон");
  assert.equal(historyResultLabel("mn", "LOSS"), "Хожигдсон");
  assert.equal(historyResultLabel("mn", "PENDING"), "Хариу гараагүй");
});

test("bet type labels map stored values to plain Mongolian", () => {
  assert.equal(betTypeLabel("mn", "WIN"), "Түрүүлнэ");
  assert.equal(betTypeLabel("mn", "PLACE"), "Айрагдана");
  assert.equal(betTypeLabel("mn", "WIN_PLACE"), "Түрүү + Айраг");
  assert.equal(betTypeLabel("mn", "WIN_PLACE_COMBO"), "Хосолсон таавар");
  assert.equal(betTypeLabel("mn", "QUINELLA"), "Хос морь");
});

test("transaction type labels map stored values to plain Mongolian", () => {
  assert.equal(transactionTypeLabel("mn", "BET_PLACED"), "Тааварт мөнгө тавьсан");
  assert.equal(transactionTypeLabel("mn", "RACE_WIN"), "Тааврын хожоо орсон");
  assert.equal(transactionTypeLabel("mn", "RACE_LOSS"), "Таавар хожоогүй");
  assert.equal(transactionTypeLabel("mn", "RECHARGE"), "Коин нэмсэн");
  assert.equal(transactionTypeLabel("mn", "ADMIN_SUBTRACT"), "Коин хассан");
});
