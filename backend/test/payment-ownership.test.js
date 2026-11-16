const { test } = require('node:test');
const assert = require('node:assert/strict');
const Payment = require('../src/domains/payments/payment.model');
const Order = require('../src/domains/orders/order.model');
const { recordPayment } = require('../src/domains/payments/payment.controller');

test('customers can request a pending payment only for their own order', async (t) => {
  const order = { customer: 'owner', totalAmount: 350 };
  t.mock.method(Order, 'findById', async () => order);
  const create = t.mock.method(Payment, 'create', async (data) => data);
  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  const req = { user: { id: 'other', role: 'customer' }, body: { order: 'id', paymentMethod: 'Card', status: 'Completed' } };
  await recordPayment(req, response, assert.fail);
  assert.equal(response.code, 403);
  assert.equal(create.mock.callCount(), 0);
  req.user.id = 'owner';
  await recordPayment(req, response, assert.fail);
  assert.equal(response.code, 201);
  assert.equal(response.body.data.status, 'Pending');
  assert.equal(response.body.data.amount, 350);
});
