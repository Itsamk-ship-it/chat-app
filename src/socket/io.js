/** Shared Socket.io instance so routes can emit events. */
let _io = null;

module.exports = {
  setIo: (io) => { _io = io; },
  getIo: () => _io,
};
