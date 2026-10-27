const router = require('express').Router();
const { rpc } = require('../grpcClients');
const { wrap, HttpError } = require('../httpError');
const { str, isInt, intParam, bodyObject } = require('../validate');

// Chỉ chính chủ hoặc Admin được xem / sửa (ghi chú API-CUS-02: "Only authorized user/admin can update")
function assertOwnerOrAdmin(req, uid) {
  if (req.user.role !== 'ADMIN' && req.user.uid !== uid) throw new HttpError(403, 'You cannot access this customer');
}

async function getCustomerProfile(uid) {
  const c = await rpc('customer', 'GetCustomer', { uid });
  return { uid: c.uid, fullname: c.fullname, mid: c.mid, membership: c.membership };
}

// API-CUS-00: lấy hồ sơ của user đang đăng nhập
router.get('/', wrap(async (req, res) => {
  const uid = req.user.uid;
  res.json(await getCustomerProfile(uid));
}));

router.get('/me', wrap(async (req, res) => {
  const uid = req.user.uid;
  res.json(await getCustomerProfile(uid));
}));

// API-CUS-01
router.get('/:uid', wrap(async (req, res) => {
  const uid = intParam(req.params.uid, 'uid');
  assertOwnerOrAdmin(req, uid);
  res.json(await getCustomerProfile(uid));
}));

// API-CUS-02
router.put('/:uid', wrap(async (req, res) => {
  const uid = intParam(req.params.uid, 'uid');
  assertOwnerOrAdmin(req, uid);
  const b = bodyObject(req);
  const hasFullname = b.fullname !== undefined;
  const hasMid = b.mid !== undefined;
  if (hasFullname && typeof b.fullname !== 'string') throw new HttpError(400, 'fullname must be a string');
  if (hasMid && !isInt(b.mid)) throw new HttpError(400, 'mid must be an integer');
  const r = await rpc('customer', 'UpdateCustomer', {
    uid, has_fullname: hasFullname, fullname: str(b.fullname), has_mid: hasMid, mid: hasMid ? b.mid : 0,
  });
  res.json({ message: 'Customer updated successfully', uid: r.uid });
}));

module.exports = router;
