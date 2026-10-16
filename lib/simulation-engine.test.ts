import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MISSIONS_CONFIG,
  calculateRubricScore,
  getTotalScore
} from './simulation-engine.ts';

test('MISSIONS_CONFIG contains all 8 missions (7 OSI layers + Final Challenge)', () => {
  for (let i = 1; i <= 8; i++) {
    assert.ok(MISSIONS_CONFIG[i], `Mission ${i} should be defined`);
    assert.ok(MISSIONS_CONFIG[i].availableTests.length > 0, `Mission ${i} must have tests`);
    assert.ok(MISSIONS_CONFIG[i].interventions.length > 0, `Mission ${i} must have interventions`);
  }
});

test('Mission 1 (Física) simulation fails when disconnected and passes after cable reconnection', () => {
  const m1 = MISSIONS_CONFIG[1];
  const initial = m1.initialState;
  assert.equal(initial.cableConnected, false);

  const testLink = m1.availableTests.find(t => t.key === 'test_link_carrier');
  assert.ok(testLink);

  // Before intervention
  const resultBefore = testLink.execute(initial);
  assert.equal(resultBefore.success, false);
  assert.equal(resultBefore.diagnosticCode, 'PHY_ERR_NO_CARRIER');

  // Apply intervention
  const reconnectIntervention = m1.interventions.find(i => i.key === 'reconnect_cable');
  assert.ok(reconnectIntervention);
  const stateAfter = reconnectIntervention.apply(initial);
  assert.equal(stateAfter.cableConnected, true);
  assert.equal(stateAfter.isResolved, true);

  // After intervention
  const resultAfter = testLink.execute(stateAfter);
  assert.equal(resultAfter.success, true);
  assert.equal(resultAfter.diagnosticCode, 'PHY_OK_LINK_UP');
});

test('Mission 3 (Rede) fails remote ping with 0.0.0.0 and succeeds with 192.168.10.1 gateway', () => {
  const m3 = MISSIONS_CONFIG[3];
  const initial = m3.initialState;
  const pingRemote = m3.availableTests.find(t => t.key === 'test_ping_remote')!;

  const res1 = pingRemote.execute(initial);
  assert.equal(res1.success, false);

  const setGateway = m3.interventions.find(i => i.key === 'set_correct_gateway')!;
  const stateFixed = setGateway.apply(initial);
  assert.equal(stateFixed.pcGateway, '192.168.10.1');
  assert.equal(stateFixed.isResolved, true);

  const res2 = pingRemote.execute(stateFixed);
  assert.equal(res2.success, true);
});

test('Mission 4 (Transporte) refuses connection on port 8080 and establishes handshake on port 80', () => {
  const m4 = MISSIONS_CONFIG[4];
  const initial = m4.initialState;
  const handshakeTest = m4.availableTests.find(t => t.key === 'test_tcp_handshake')!;

  const res1 = handshakeTest.execute(initial);
  assert.equal(res1.success, false);
  assert.equal(res1.diagnosticCode, 'TCP_CONNECTION_REFUSED_RST');

  const fixPort = m4.interventions.find(i => i.key === 'change_tcp_port_80')!;
  const stateFixed = fixPort.apply(initial);
  assert.equal(stateFixed.tcpPortTarget, 80);

  const res2 = handshakeTest.execute(stateFixed);
  assert.equal(res2.success, true);
  assert.equal(res2.diagnosticCode, 'TCP_HANDSHAKE_ESTABLISHED');
});

test('Mission 8 (Integrador) requires both Port 80 and UTF-8 to resolve', () => {
  const m8 = MISSIONS_CONFIG[8];
  let state = m8.initialState;
  assert.equal(state.isResolved, false);

  const fixPort = m8.interventions.find(i => i.key === 'fix_pc2_port')!;
  const fixEnc = m8.interventions.find(i => i.key === 'fix_pc2_encoding')!;

  state = fixPort.apply(state);
  assert.equal(state.isResolved, false, 'Only fixing port should not resolve yet');

  state = fixEnc.apply(state);
  assert.equal(state.isResolved, true, 'Fixing both port and encoding resolves mission 8');
});

test('calculateRubricScore generates scores across all 6 criteria up to 10 points', () => {
  const rubric = calculateRubricScore({
    completedMissions: [1, 2, 3, 4, 5, 6, 7, 8],
    hypotheses: [
      { id: '1', missionNumber: 1, statement: 'Cabo desconectado gerando falha elétrica', selectedConceptIds: ['l1-link-status'], createdAt: '', status: 'confirmada' },
      { id: '2', missionNumber: 2, statement: 'Tabela MAC precisa aprender o destino', selectedConceptIds: ['l2-mac-address'], createdAt: '', status: 'confirmada' },
      { id: '3', missionNumber: 3, statement: 'Gateway padrão ausente para roteamento', selectedConceptIds: ['l3-default-gateway'], createdAt: '', status: 'confirmada' },
      { id: '4', missionNumber: 4, statement: 'Porta 8080 fechada precisa de porta 80', selectedConceptIds: ['l4-ports'], createdAt: '', status: 'confirmada' },
      { id: '5', missionNumber: 5, statement: 'Token de sessão expirou necessita renovação', selectedConceptIds: ['l5-session-expiry'], createdAt: '', status: 'confirmada' },
      { id: '6', missionNumber: 6, statement: 'Encoding incompatível precisa de UTF-8', selectedConceptIds: ['l6-encoding'], createdAt: '', status: 'confirmada' },
      { id: '7', missionNumber: 7, statement: 'URI do recurso deve ser corrigida para boletim', selectedConceptIds: ['l7-status-codes'], createdAt: '', status: 'confirmada' }
    ],
    tests: [
      { id: 't1', missionNumber: 1, testKey: 'k1', testName: 'T1', predictedResult: 'Link down', actualResult: '', interpretation: 'O cabo estava solto na placa', executedAt: '', success: true },
      { id: 't2', missionNumber: 2, testKey: 'k2', testName: 'T2', predictedResult: 'MAC missing', actualResult: '', interpretation: 'A tabela CAM não conhecia a porta', executedAt: '', success: true },
      { id: 't3', missionNumber: 3, testKey: 'k3', testName: 'T3', predictedResult: 'No route', actualResult: '', interpretation: 'O roteador não recebia pacotes', executedAt: '', success: true },
      { id: 't4', missionNumber: 4, testKey: 'k4', testName: 'T4', predictedResult: 'TCP RST', actualResult: '', interpretation: 'Porta 8080 não escutava conexões', executedAt: '', success: true },
      { id: 't5', missionNumber: 5, testKey: 'k5', testName: 'T5', predictedResult: 'Session err', actualResult: '', interpretation: 'Token estava desincronizado', executedAt: '', success: true },
      { id: 't6', missionNumber: 6, testKey: 'k6', testName: 'T6', predictedResult: 'Mojibake', actualResult: '', interpretation: 'Bytes acentuados foram truncados', executedAt: '', success: true },
      { id: 't7', missionNumber: 7, testKey: 'k7', testName: 'T7', predictedResult: '404', actualResult: '', interpretation: 'Servidor respondeu mas faltava o arquivo', executedAt: '', success: true },
      { id: 't8', missionNumber: 8, testKey: 'k8', testName: 'T8', predictedResult: 'L4 fail', actualResult: '', interpretation: 'Duplo diagnóstico realizado', executedAt: '', success: true }
    ],
    savedConceptIds: ['l1-link-status', 'l2-mac-address', 'l3-default-gateway', 'l4-ports', 'l5-session-expiry', 'l6-encoding', 'l7-status-codes'],
    consolidations: {
      1: { missionNumber: 1, identifiedCause: '', evidenceUsed: [], relatedLayers: [1], justificationText: 'Explicação detalhada comprovada pelo link restabelecido', verificationConfirmed: true, submittedAt: '' },
      2: { missionNumber: 2, identifiedCause: '', evidenceUsed: [], relatedLayers: [2], justificationText: 'Explicação do encaminhamento do switch pelo MAC', verificationConfirmed: true, submittedAt: '' },
      3: { missionNumber: 3, identifiedCause: '', evidenceUsed: [], relatedLayers: [3], justificationText: 'Explicação da necessidade do gateway no roteador', verificationConfirmed: true, submittedAt: '' },
      4: { missionNumber: 4, identifiedCause: '', evidenceUsed: [], relatedLayers: [4], justificationText: 'Explicação do 3-way handshake e porta 80', verificationConfirmed: true, submittedAt: '' },
      5: { missionNumber: 5, identifiedCause: '', evidenceUsed: [], relatedLayers: [5], justificationText: 'Explicação da renovação do token de sessão', verificationConfirmed: true, submittedAt: '' },
      6: { missionNumber: 6, identifiedCause: '', evidenceUsed: [], relatedLayers: [6], justificationText: 'Explicação do charset UTF-8 e bytes', verificationConfirmed: true, submittedAt: '' },
      7: { missionNumber: 7, identifiedCause: '', evidenceUsed: [], relatedLayers: [7], justificationText: 'Explicação do código HTTP 404 vs 200 OK', verificationConfirmed: true, submittedAt: '' }
    }
  });

  const total = getTotalScore(rubric);
  assert.equal(total, 10.0);
  assert.equal(rubric.desafio_final.autoScore, 1.0);
});
