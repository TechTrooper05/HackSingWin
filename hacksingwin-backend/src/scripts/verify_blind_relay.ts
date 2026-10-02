import axios from 'axios';

// Load socket.io-client from frontend node_modules
const { io } = require('../../../hacksingwin-frontend/node_modules/socket.io-client');

const API_BASE = 'http://localhost:4000/api';

async function testBlindRelay() {
  console.log('====================================================');
  console.log('🔒 TESTING BLIND RELAY MODE (SPECTATOR CODE CONCEALMENT)');
  console.log('====================================================\n');

  // 1. Login Member A (Writer) and Member B (Spectator)
  const loginA = await axios.post(`${API_BASE}/auth/login`, {
    username: 'team1_member_a',
    password: 'pass123',
  });
  const tokenA = loginA.data.token;
  const userA = loginA.data.user;

  const loginB = await axios.post(`${API_BASE}/auth/login`, {
    username: 'team1_member_b',
    password: 'pass123',
  });
  const tokenB = loginB.data.token;
  const userB = loginB.data.user;

  console.log(`[AUTH] Member A (Expected Writer): ${userA.username}`);
  console.log(`[AUTH] Member B (Expected Spectator): ${userB.username}`);

  // 2. Connect Member A (Writer) Socket
  let writerInitialCode = 'NOT_SET';
  const socketA = io('http://localhost:4000', {
    auth: { token: tokenA },
    transports: ['websocket'],
  });

  await new Promise<void>((resolve) => {
    socketA.on('SYNC_STATE', (data: any) => {
      writerInitialCode = data.code;
      console.log(`   [PASS] Writer (Member A) received SYNC_STATE: code length = ${data.code?.length || 0}`);
      resolve();
    });
  });

  // 3. Connect Member B (Spectator) Socket
  let spectatorInitialCode = 'NOT_SET';
  let spectatorReceivedRemoteUpdateCount = 0;

  const socketB = io('http://localhost:4000', {
    auth: { token: tokenB },
    transports: ['websocket'],
  });

  await new Promise<void>((resolve) => {
    socketB.on('SYNC_STATE', (data: any) => {
      spectatorInitialCode = data.code;
      console.log(`   [PASS] Spectator (Member B) received SYNC_STATE: code = "${data.code}"`);
      resolve();
    });
  });

  socketB.on('REMOTE_CODE_UPDATE', (data: any) => {
    console.error('   ❌ LEAK DETECTED: Spectator received REMOTE_CODE_UPDATE:', data);
    spectatorReceivedRemoteUpdateCount++;
  });

  // Verify Spectator received EMPTY code on sync
  if (spectatorInitialCode !== '') {
    throw new Error(`Spectator received non-empty code on SYNC_STATE: "${spectatorInitialCode}"`);
  }
  console.log('   ✓ CONFIRMED: Spectator received EMPTY code upon initial connection/refresh.');

  // 4. Writer types code in Monaco Editor
  const secretCode = `# SECRET_RELAY_CODE_${Date.now()}\ndef solve():\n    return 42\n`;
  console.log('\n[TEST] Active Writer typing new code in Monaco editor...');
  socketA.emit('CODE_UPDATE', { code: secretCode, genId: 1 });

  // Wait 1.5 seconds to see if any keystrokes leak to spectator
  await new Promise((r) => setTimeout(r, 1500));

  if (spectatorReceivedRemoteUpdateCount > 0) {
    throw new Error(`Spectator received ${spectatorReceivedRemoteUpdateCount} keystroke packets!`);
  }
  console.log('   ✓ CONFIRMED: Spectator received 0 keystrokes while teammate was coding (Zero Leaks).');

  // 5. Trigger Turn Switch: Handover floor to Member B
  console.log('\n[TEST] Organizer triggering turn switch handover to Member B...');
  let handedOverCode = '';
  let newWriterId = '';

  const handoverPromise = new Promise<void>((resolve) => {
    socketB.on('SWITCH_COMPLETE', (data: any) => {
      handedOverCode = data.code;
      newWriterId = data.newEditorId;
      console.log(`   [PASS] Member B received SWITCH_COMPLETE. New Writer ID: ${newWriterId}`);
      console.log(`   [PASS] Transferred code matches secret code: ${data.code === secretCode}`);
      resolve();
    });
  });

  // Admin triggers switch
  const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
    username: 'organizer_main',
    password: 'admin123',
  });
  await axios.post(
    `${API_BASE}/admin/switch-turn`,
    { teamId: userA.teamId, durationSeconds: 300 },
    { headers: { Authorization: `Bearer ${adminLogin.data.token}` } }
  );

  await handoverPromise;

  if (handedOverCode !== secretCode) {
    throw new Error(`Handed over code does not match what writer typed! Got: "${handedOverCode}"`);
  }

  console.log('\n====================================================');
  console.log('🎉 BLIND RELAY INTEGRATION VERIFIED 100% SECURE:');
  console.log('   1. Code completely concealed while spectator is waiting.');
  console.log('   2. Zero keystroke leakage over WebSocket network.');
  console.log('   3. Full code buffer transferred immediately upon turn switch.');
  console.log('====================================================\n');

  socketA.disconnect();
  socketB.disconnect();
  process.exit(0);
}

testBlindRelay().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
