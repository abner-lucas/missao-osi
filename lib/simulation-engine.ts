import type {
  MissionSimulationState,
  TestExecutionRecord,
  InvestigationHypothesis,
  MissionConsolidation,
  RubricCriteriaScore
} from './types';

export interface MissionDefinition {
  missionNumber: number;
  layerNumber: number;
  layerName: string;
  title: string;
  subtitle: string;
  initialProblemDescription: string;
  initialTopologySymptoms: string[];
  initialState: MissionSimulationState;
  availableTests: {
    key: string;
    label: string;
    category: 'fisico' | 'enlace' | 'rede' | 'transporte' | 'sessao' | 'apresentacao' | 'aplicacao';
    description: string;
    execute: (state: MissionSimulationState) => {
      output: string;
      success: boolean;
      diagnosticCode: string;
    };
  }[];
  interventions: {
    key: string;
    label: string;
    description: string;
    apply: (state: MissionSimulationState, param?: string | number) => MissionSimulationState;
  }[];
  requiredConceptIds: string[];
  correctCauseSummary: string;
}

export const MISSIONS_CONFIG: Record<number, MissionDefinition> = {
  1: {
    missionNumber: 1,
    layerNumber: 1,
    layerName: 'Física',
    title: 'O Sinal Desaparecido',
    subtitle: 'Ausência de link elétrico e sinais entre o PC e o Switch',
    initialProblemDescription: 'O computador do laboratório não consegue transmitir nenhum bit para a rede local. Nenhum sinal luminoso está presente no conector de rede.',
    initialTopologySymptoms: [
      'LED Link/Act da placa de rede do PC está totalmente APAGADO',
      'Porta Fa0/1 do Switch não detecta portadora elétrica (No Carrier)',
      'Transmissor físico não detecta pulsos de link (Fast Link Pulses ausentes)'
    ],
    initialState: {
      missionNumber: 1,
      isResolved: false,
      cableConnected: false,
      linkLedActive: false
    },
    availableTests: [
      {
        key: 'test_link_carrier',
        label: 'Verificar Portadora de Link (Fast Link Pulses)',
        category: 'fisico',
        description: 'Mede presença de sinal de pulso elétrico no par de pinos 1-2 e 3-6 do conector RJ-45.',
        execute: (state) => {
          if (!state.cableConnected) {
            return {
              output: '[TESTE FÍSICO] Tensão nos pinos: 0.0V. Status: LINK DOWN. Ausência de continuidade elétrica.',
              success: false,
              diagnosticCode: 'PHY_ERR_NO_CARRIER'
            };
          }
          return {
            output: '[TESTE FÍSICO] Tensão nos pinos: 2.5V (MLT-3 detectado). Status: 1000BASE-T FULL-DUPLEX. Link ESTÁVEL.',
            success: true,
            diagnosticCode: 'PHY_OK_LINK_UP'
          };
        }
      },
      {
        key: 'test_cable_continuity',
        label: 'Teste de Continuidade e Pinagem T568B',
        category: 'fisico',
        description: 'Injeta sinal de teste pelo cabo UTP para verificar rompimento de pares.',
        execute: (state) => {
          if (!state.cableConnected) {
            return {
              output: '[CONTINUIDADE] Circuito ABERTO (Open Circuit) no conector. Cabo desconectado da porta RJ-45.',
              success: false,
              diagnosticCode: 'PHY_ERR_OPEN_CIRCUIT'
            };
          }
          return {
            output: '[CONTINUIDADE] Pares 1-2, 3-6, 4-5, 7-8 verificados. Atenuação: 1.2 dB (dentro do padrão TIA-568B).',
            success: true,
            diagnosticCode: 'PHY_OK_CABLE_PASS'
          };
        }
      }
    ],
    interventions: [
      {
        key: 'reconnect_cable',
        label: 'Conectar e Travar Cabo RJ-45 Cat6 na Porta',
        description: 'Encaixa o conector modular RJ-45 até travar na porta física da placa de rede.',
        apply: (state) => ({
          ...state,
          cableConnected: true,
          linkLedActive: true,
          isResolved: true
        })
      }
    ],
    requiredConceptIds: ['l1-medium-vs-connector', 'l1-link-status', 'l1-pinout'],
    correctCauseSummary: 'Cabo par trançado UTP desconectado fisicamente da porta RJ-45, impedindo a propagação de pulsos elétricos de link.'
  },
  2: {
    missionNumber: 2,
    layerNumber: 2,
    layerName: 'Enlace',
    title: 'O Caminho do Quadro',
    subtitle: 'Comutação no enlace local e encaminhamento por tabela MAC',
    initialProblemDescription: 'Com o link físico restabelecido, o computador envia quadros Ethernet, mas eles estão sendo descartados porque o switch não mapeou a porta de destino correta.',
    initialTopologySymptoms: [
      'Quadro Ethernet emitido com MAC destino desconhecido',
      'Tabela CAM (MAC Table) do switch sem entrada para o host de destino',
      'Comutador precisa aprender o mapeamento MAC x Porta Física'
    ],
    initialState: {
      missionNumber: 2,
      isResolved: false,
      macDestination: '00:00:00:00:00:00',
      switchPortLearned: false
    },
    availableTests: [
      {
        key: 'test_mac_table',
        label: 'Consultar Tabela MAC do Switch (show mac address-table)',
        category: 'enlace',
        description: 'Lista os endereços MAC aprendidos pelo switch e as respectivas portas.',
        execute: (state) => {
          if (!state.switchPortLearned) {
            return {
              output: '[TABELA MAC] Porta Fa0/1: 00:1A:2B:3C:4D:5E (PC Aluno) | Porta Fa0/24: VAZIO. Destino desconhecido.',
              success: false,
              diagnosticCode: 'MAC_TABLE_ENTRY_MISSING'
            };
          }
          return {
            output: '[TABELA MAC] Porta Fa0/1: 00:1A:2B:3C:4D:5E (PC) | Porta Fa0/24: A4:4C:11:89:12:01 (Gateway). Mapeado com sucesso.',
            success: true,
            diagnosticCode: 'MAC_TABLE_RESOLVED'
          };
        }
      },
      {
        key: 'test_frame_fcs',
        label: 'Inspecionar Cabeçalho e Trailer FCS do Quadro',
        category: 'enlace',
        description: 'Calcula o CRC32 do quadro para verificar integridade e campos de origem/destino.',
        execute: (state) => {
          if (!state.switchPortLearned) {
            return {
              output: '[INSPEÇÃO DE QUADRO] EtherType: 0x0800 | FCS: Válido | Destino MAC não encontrado no segmento local.',
              success: false,
              diagnosticCode: 'FRAME_TARGET_UNREACHABLE'
            };
          }
          return {
            output: '[INSPEÇÃO DE QUADRO] MAC Origem: 00:1A:2B:3C:4D:5E | MAC Destino: A4:4C:11:89:12:01 | FCS: OK (Quadro íntegro).',
            success: true,
            diagnosticCode: 'FRAME_SUCCESS_DELIVERED'
          };
        }
      }
    ],
    interventions: [
      {
        key: 'resolve_mac_mapping',
        label: 'Disparar Resolução de Endereço Local (Mapear MAC do Gateway)',
        description: 'Executa envio de quadro de aprendizado para que o switch registre o MAC do Gateway na porta Fa0/24.',
        apply: (state) => ({
          ...state,
          macDestination: 'A4:4C:11:89:12:01',
          switchPortLearned: true,
          isResolved: true
        })
      }
    ],
    requiredConceptIds: ['l2-mac-address', 'l2-switch-learning', 'l2-fcs-errors'],
    correctCauseSummary: 'O switch local necessitava aprender a correspondência do endereço MAC de destino para encaminhar o quadro sem descarte.'
  },
  3: {
    missionNumber: 3,
    layerNumber: 3,
    layerName: 'Rede',
    title: 'O Pacote Sem Caminho',
    subtitle: 'Roteamento inter-redes e configuração do Gateway Padrão',
    initialProblemDescription: 'O computador alcança outros computadores da rede local 192.168.10.0/24, mas não consegue acessar o servidor educacional na rede remota 10.0.20.10. O pacote é descartado antes de alcançar o roteador.',
    initialTopologySymptoms: [
      'Ping para 192.168.10.2 (mesma sub-rede) RESPONDE com sucesso',
      'Ping para 10.0.20.10 (rede remota) falha com "Rede de destino inacessível"',
      'Configuração IP do PC: Gateway Padrão ausente ou configurado como 0.0.0.0'
    ],
    initialState: {
      missionNumber: 3,
      isResolved: false,
      pcIp: '192.168.10.25',
      pcSubnet: '255.255.255.0',
      pcGateway: '0.0.0.0', // Incorreto/Ausente
      targetIp: '10.0.20.10'
    },
    availableTests: [
      {
        key: 'test_ping_local',
        label: 'Ping para Estação Local (192.168.10.2)',
        category: 'rede',
        description: 'Testa envio de pacotes ICMP Echo Request dentro da mesma sub-rede /24.',
        execute: () => ({
          output: 'PING 192.168.10.2: 4 pacotes transmitidos, 4 recebidos, 0% perda de pacotes (tempo < 1ms). Comunicação local FUNCIONA.',
          success: true,
          diagnosticCode: 'PING_LOCAL_SUCCESS'
        })
      },
      {
        key: 'test_ping_remote',
        label: 'Ping para Servidor Remoto (10.0.20.10)',
        category: 'rede',
        description: 'Testa envio de pacotes ICMP para sub-rede externa através do roteador.',
        execute: (state) => {
          if (state.pcGateway !== '192.168.10.1') {
            return {
              output: 'PING 10.0.20.10: Host 192.168.10.25 informa: Destino inacessível (No route to host / Gateway indefinido).',
              success: false,
              diagnosticCode: 'ICMP_NO_GATEWAY'
            };
          }
          return {
            output: 'PING 10.0.20.10: Resposta de 10.0.20.10: bytes=32 tempo=12ms TTL=63 (Encaminhado pelo Gateway 192.168.10.1).',
            success: true,
            diagnosticCode: 'ICMP_REMOTE_SUCCESS'
          };
        }
      },
      {
        key: 'test_traceroute',
        label: 'Rastrear Rota de Pacotes (Traceroute)',
        category: 'rede',
        description: 'Examina cada salto do roteador até o servidor educacional.',
        execute: (state) => {
          if (state.pcGateway !== '192.168.10.1') {
            return {
              output: 'traceroute 10.0.20.10:\n 1  * * * Falha: PC não sabe para onde despachar pacotes fora da sub-rede.',
              success: false,
              diagnosticCode: 'TRACE_FAIL_FIRST_HOP'
            };
          }
          return {
            output: 'traceroute 10.0.20.10:\n 1  192.168.10.1 (Gateway Roteador) 1.1ms\n 2  10.0.20.10 (Servidor Educacional) 11.4ms',
            success: true,
            diagnosticCode: 'TRACE_SUCCESS_TWO_HOPS'
          };
        }
      }
    ],
    interventions: [
      {
        key: 'set_correct_gateway',
        label: 'Configurar Default Gateway para 192.168.10.1',
        description: 'Define a interface do roteador local como porta de saída para todas as redes remotas.',
        apply: (state) => ({
          ...state,
          pcGateway: '192.168.10.1',
          isResolved: true
        })
      }
    ],
    requiredConceptIds: ['l3-ip-addressing', 'l3-default-gateway', 'l3-routing-table'],
    correctCauseSummary: 'Ausência do Gateway Padrão (Default Gateway 192.168.10.1) na configuração de rede do computador, impedindo que o roteador recebesse os pacotes destinados a outra rede.'
  },
  4: {
    missionNumber: 4,
    layerNumber: 4,
    layerName: 'Transporte',
    title: 'A Conexão Interrompida',
    subtitle: 'Portas lógicas e handshake de três vias (TCP SYN)',
    initialProblemDescription: 'Os pacotes IP agora chegam ao servidor 10.0.20.10, mas a aplicação educacional recebe uma recusa imediata de conexão TCP (flag RST). O serviço não está respondendo na porta requisitada.',
    initialTopologySymptoms: [
      'Cliente tentando conexão TCP na porta de destino 8080',
      'Servidor responde com segmento TCP contendo a flag [RST, ACK]',
      'Serviço web institucional está escutando na porta padrão HTTP 80'
    ],
    initialState: {
      missionNumber: 4,
      isResolved: false,
      tcpPortTarget: 8080,
      tcpServiceListening: false
    },
    availableTests: [
      {
        key: 'test_tcp_handshake',
        label: 'Inspecionar 3-Way Handshake TCP (SYN → SYN-ACK → ACK)',
        category: 'transporte',
        description: 'Registra os segmentos trocados para estabelecer o canal orientado a conexão.',
        execute: (state) => {
          if (state.tcpPortTarget !== 80) {
            return {
              output: 'TENTATIVA TCP Porta ' + state.tcpPortTarget + ':\n 1. [CLIENTE -> SERVIDOR] SYN seq=1000\n 2. [SERVIDOR -> CLIENTE] RST, ACK ack=1001 (Conexão rejeitada: Nenhuma aplicação escutando nesta porta).',
              success: false,
              diagnosticCode: 'TCP_CONNECTION_REFUSED_RST'
            };
          }
          return {
            output: 'TENTATIVA TCP Porta 80:\n 1. [CLIENTE -> SERVIDOR] SYN seq=1000\n 2. [SERVIDOR -> CLIENTE] SYN-ACK seq=5000 ack=1001\n 3. [CLIENTE -> SERVIDOR] ACK ack=5001\n STATUS: ESTABLISHED (Canal confiável aberto).',
            success: true,
            diagnosticCode: 'TCP_HANDSHAKE_ESTABLISHED'
          };
        }
      },
      {
        key: 'test_netstat_services',
        label: 'Verificar Portas em Escuta no Servidor (netstat -tuln)',
        category: 'transporte',
        description: 'Varre os processos e portas ativas de transporte no host de destino.',
        execute: () => ({
          output: 'SERVIÇOS ATIVOS EM 10.0.20.10:\n - Proto: TCP | Porta Local: 0.0.0.0:80 | Estado: LISTEN | Processo: ifpa-web-server\n - Proto: TCP | Porta Local: 0.0.0.0:22 | Estado: LISTEN | Processo: sshd\n (Atenção: A porta 8080 não consta em LISTEN).',
          success: true,
          diagnosticCode: 'NETSTAT_PORT_80_LISTENING'
        })
      }
    ],
    interventions: [
      {
        key: 'change_tcp_port_80',
        label: 'Ajustar Porta de Destino do Serviço para 80 (HTTP)',
        description: 'Configura o cliente para conectar na porta lógica correta onde o servidor web está em estado LISTEN.',
        apply: (state) => ({
          ...state,
          tcpPortTarget: 80,
          tcpServiceListening: true,
          isResolved: true
        })
      }
    ],
    requiredConceptIds: ['l4-ports', 'l4-three-way-handshake', 'l4-tcp-vs-udp'],
    correctCauseSummary: 'O cliente requisitava a porta TCP 8080 fechada, recebendo TCP RST. O serviço web do servidor estava escutando na porta 80 (HTTP padrão).'
  },
  5: {
    missionNumber: 5,
    layerNumber: 5,
    layerName: 'Sessão',
    title: 'O Diálogo Perdido',
    subtitle: 'Sincronização, manutenção de estado e renovação do token de sessão',
    initialProblemDescription: 'A conexão TCP está estabelecida e confiável, mas as solicitações de transação do aluno são rejeitadas pelo servidor com aviso de sessão inválida ou desincronizada.',
    initialTopologySymptoms: [
      'Segmentos TCP chegam intactos e confirmados',
      'Camada de Sessão rejeita mensagens: Token ID expirado no servidor',
      'Necessário restabelecer o diálogo lógico e renovar o contexto de sessão'
    ],
    initialState: {
      missionNumber: 5,
      isResolved: false,
      sessionTokenStatus: 'expirado'
    },
    availableTests: [
      {
        key: 'test_session_dialog',
        label: 'Verificar Estado do Diálogo e Identificador de Sessão',
        category: 'sessao',
        description: 'Analisa se as pontas de comunicação compartilham um identificador de sessão ativo.',
        execute: (state) => {
          if (state.sessionTokenStatus !== 'valido') {
            return {
              output: '[SESSÃO OSI] Token: "SES-2026-EXPIRED". Status: DIÁLOGO RECUSADO. O tempo limite do canal expirou.',
              success: false,
              diagnosticCode: 'SESSION_EXPIRED_OR_DESYNC'
            };
          }
          return {
            output: '[SESSÃO OSI] Token: "SES-BREVES-2026-ACTIVE". Status: DIÁLOGO SINCRONIZADO. Modo: Full-Duplex coordenado.',
            success: true,
            diagnosticCode: 'SESSION_SYNCED_OK'
          };
        }
      }
    ],
    interventions: [
      {
        key: 'renew_session_token',
        label: 'Renovar e Sincronizar Token de Diálogo de Sessão',
        description: 'Emite comando de controle de sessão para revalidar o identificador de diálogo.',
        apply: (state) => ({
          ...state,
          sessionTokenStatus: 'valido',
          isResolved: true
        })
      }
    ],
    requiredConceptIds: ['l5-dialog-control', 'l5-session-expiry'],
    correctCauseSummary: 'O identificador de diálogo da camada de sessão estava expirado, exigindo renovação do token de contexto para autorizar a continuidade das trocas lógicas.'
  },
  6: {
    missionNumber: 6,
    layerNumber: 6,
    layerName: 'Apresentação',
    title: 'Dados que Não Fazem Sentido',
    subtitle: 'Sintaxe, codificação de caracteres e decodificação UTF-8',
    initialProblemDescription: 'Os dados da resposta do servidor chegam ao laboratório, porém o texto da página acadêmica é exibido com caracteres corrompidos ("AvaliaÃ§Ã£o de Redes no Campus Breves").',
    initialTopologySymptoms: [
      'Texto recebido com erro sintático evidente (Mojibake)',
      'Bytes originais foram gerados em UTF-8 (multibyte para caracteres especiais)',
      'Camada de apresentação do cliente estava forçando decodificação em ISO-8859-1'
    ],
    initialState: {
      missionNumber: 6,
      isResolved: false,
      dataEncoding: 'ISO-8859-1'
    },
    availableTests: [
      {
        key: 'test_byte_charset',
        label: 'Inspecionar Sequência Bruta de Bytes vs Decodificação',
        category: 'apresentacao',
        description: 'Exibe os bytes hexadecimais recebidos e a representação de caracteres resultante.',
        execute: (state) => {
          if (state.dataEncoding !== 'UTF-8') {
            return {
              output: 'BYTES RECEBIDOS: [0x41, 0x76, 0x61, 0x6C, 0x69, 0x61, 0xC3, 0xA7, 0xC3, 0xA3, 0x6F]\n DECODIFICAÇÃO ATUAL (ISO-8859-1): "AvaliaÃ§Ã£o"\n DIAGNÓSTICO: Bytes 0xC3 0xA7 foram interpretados individualmente em vez de um único caractere "ç".',
              success: false,
              diagnosticCode: 'PRESENTATION_MOJIBAKE_DETECTED'
            };
          }
          return {
            output: 'BYTES RECEBIDOS: [0x41, 0x76, 0x61, 0x6C, 0x69, 0x61, 0xC3, 0xA7, 0xC3, 0xA3, 0x6F]\n DECODIFICAÇÃO ATUAL (UTF-8): "Avaliação"\n DIAGNÓSTICO: Sintaxe correta. Caracteres acentuados renderizados com fidelidade semântica.',
            success: true,
            diagnosticCode: 'PRESENTATION_UTF8_RESOLVED'
          };
        }
      }
    ],
    interventions: [
      {
        key: 'set_encoding_utf8',
        label: 'Ajustar Decodificador da Camada de Apresentação para UTF-8',
        description: 'Alinha a tabela de tradução sintática para que a sequência multibyte Unicode seja interpretada corretamente.',
        apply: (state) => ({
          ...state,
          dataEncoding: 'UTF-8',
          isResolved: true
        })
      }
    ],
    requiredConceptIds: ['l6-encoding', 'l6-compression', 'l6-crypto'],
    correctCauseSummary: 'Incompatibilidade sintática na camada de apresentação: bytes em UTF-8 estavam sendo interpretados como ISO-8859-1, gerando mojibake nos acentos gráficos.'
  },
  7: {
    missionNumber: 7,
    layerNumber: 7,
    layerName: 'Aplicação',
    title: 'O Recurso Indisponível',
    subtitle: 'Protocolo HTTP e requisição do recurso correto',
    initialProblemDescription: 'Toda a infraestrutura de rede, transporte, sessão e apresentação está operacional. O navegador simulado envia a requisição HTTP GET para "/notas.html", mas o servidor responde com código 404 Not Found.',
    initialTopologySymptoms: [
      'Conexão nas camadas 1 a 6 bem-sucedida',
      'Resposta HTTP recebida: Status Code 404 Not Found',
      'O documento acadêmico oficial no servidor chama-se "/boletim.html"'
    ],
    initialState: {
      missionNumber: 7,
      isResolved: false,
      targetResourceUri: '/notas.html'
    },
    availableTests: [
      {
        key: 'test_http_request',
        label: 'Emitir Requisição HTTP GET e Inspecionar Resposta',
        category: 'aplicacao',
        description: 'Envia cabeçalho HTTP completo e recebe a resposta com código de status e payload.',
        execute: (state) => {
          if (state.targetResourceUri !== '/boletim.html') {
            return {
              output: 'HTTP/1.1 404 Not Found\n Content-Type: text/html\n Server: IFPA-Web/2.4\n Payload: <h1>404 Recurso Não Encontrado: ' + state.targetResourceUri + '</h1>\n (A comunicação de rede funcionou, mas o recurso solicitado não existe no servidor).',
              success: false,
              diagnosticCode: 'HTTP_404_NOT_FOUND'
            };
          }
          return {
            output: 'HTTP/1.1 200 OK\n Content-Type: text/html; charset=UTF-8\n Content-Length: 1420\n Payload: <h1>Portal do Aluno - Boletim Oficial do IFPA Campus Breves</h1><p>Situação: Regular</p>',
            success: true,
            diagnosticCode: 'HTTP_200_OK'
          };
        }
      },
      {
        key: 'test_directory_listing',
        label: 'Consultar Lista de Recursos Disponíveis no Servidor',
        category: 'aplicacao',
        description: 'Verifica o índice de páginas públicas disponibilizadas pela aplicação web.',
        execute: () => ({
          output: 'ÍNDICE DE ARQUIVOS EM /var/www/html/:\n - /index.html (Página Principal)\n - /boletim.html (Boletim e Avaliações de Redes)\n - /calendario.html (Calendário Acadêmico)',
          success: true,
          diagnosticCode: 'HTTP_DIR_LISTED'
        })
      }
    ],
    interventions: [
      {
        key: 'fix_resource_uri',
        label: 'Corrigir URI da Requisição para "/boletim.html"',
        description: 'Atualiza o caminho no comando HTTP GET para o recurso existente no catálogo da aplicação.',
        apply: (state) => ({
          ...state,
          targetResourceUri: '/boletim.html',
          isResolved: true
        })
      }
    ],
    requiredConceptIds: ['l7-client-server', 'l7-status-codes', 'l7-dns-resolution'],
    correctCauseSummary: 'O código HTTP 404 Not Found comprovou que a comunicação estava perfeita até a camada 7, mas o recurso solicitado no servidor web chamava-se "/boletim.html" e não "/notas.html".'
  },
  8: {
    missionNumber: 8,
    layerNumber: 0, // Integrador
    layerName: 'Integração Final',
    title: 'Desafio Integrador Multicamada',
    subtitle: 'Diagnóstico cruzado: Falha de Transporte e de Apresentação em nova estação',
    initialProblemDescription: 'Uma segunda estação de trabalho do laboratório (PC-2: 192.168.10.30) alcança o roteador, mas não consegue acessar a API de notas por falha de porta lógica. E após ajustar a porta, o payload retornado sofre de incompatibilidade de codificação.',
    initialTopologySymptoms: [
      'Estação PC-2 tentando conectar na porta TCP 443 em servidor sem TLS configurado',
      'Servidor responde com TCP RST na porta 443; serviço está na porta 80',
      'Conteúdo da API usa charset UTF-8 mas PC-2 foi pré-configurado com codificação ASCII pura'
    ],
    initialState: {
      missionNumber: 8,
      isResolved: false,
      secondaryServicePortOk: false,
      secondaryEncodingOk: false
    },
    availableTests: [
      {
        key: 'test_diag_pc2_transport',
        label: 'Diagnóstico L4: Testar Conexão TCP do PC-2',
        category: 'transporte',
        description: 'Envia SYN na porta configurada para o PC-2.',
        execute: (state) => {
          if (!state.secondaryServicePortOk) {
            return {
              output: '[PC-2 TCP DIAG] Enviando SYN para 10.0.20.10:443 -> Recebido TCP RST. Porta 443 não possui listener ativo.',
              success: false,
              diagnosticCode: 'INT_L4_FAIL'
            };
          }
          return {
            output: '[PC-2 TCP DIAG] Enviando SYN para 10.0.20.10:80 -> Recebido SYN-ACK. Conexão TCP ESTABLISHED na Camada 4.',
            success: true,
            diagnosticCode: 'INT_L4_OK'
          };
        }
      },
      {
        key: 'test_diag_pc2_presentation',
        label: 'Diagnóstico L6: Inspecionar Decodificação de Caracteres no PC-2',
        category: 'apresentacao',
        description: 'Verifica se os bytes da resposta são interpretados corretamente.',
        execute: (state) => {
          if (!state.secondaryEncodingOk) {
            return {
              output: '[PC-2 L6 DIAG] Caracteres fora da tabela ASCII 7 bits são descartados ou substituídos por ponto de interrogação (????).',
              success: false,
              diagnosticCode: 'INT_L6_FAIL'
            };
          }
          return {
            output: '[PC-2 L6 DIAG] Codificação ajustada para UTF-8. Acentuação e pontuação corretas.',
            success: true,
            diagnosticCode: 'INT_L6_OK'
          };
        }
      }
    ],
    interventions: [
      {
        key: 'fix_pc2_port',
        label: 'Ajustar Porta do PC-2 para 80 (Camada 4 - Transporte)',
        description: 'Direciona as requisições para a porta HTTP aberta no servidor.',
        apply: (state) => {
          const next = { ...state, secondaryServicePortOk: true };
          next.isResolved = Boolean(next.secondaryServicePortOk && next.secondaryEncodingOk);
          return next;
        }
      },
      {
        key: 'fix_pc2_encoding',
        label: 'Habilitar UTF-8 no Cliente PC-2 (Camada 6 - Apresentação)',
        description: 'Configura o decodificador para suporte completo aos acentos do idioma português.',
        apply: (state) => {
          const next = { ...state, secondaryEncodingOk: true };
          next.isResolved = Boolean(next.secondaryServicePortOk && next.secondaryEncodingOk);
          return next;
        }
      }
    ],
    requiredConceptIds: ['l4-ports', 'l6-encoding'],
    correctCauseSummary: 'Cenário duplo: 1) Camada de Transporte: PC-2 tentava porta 443 inexistente e precisava ser alterado para a porta 80. 2) Camada de Apresentação: codificação ASCII truncava caracteres acentuados, exigindo decodificação UTF-8.'
  }
};

/**
 * Calculates student rubric scores based on process evidence, test executions,
 * hypotheses formulated, OSI concepts linked, and final integrator mission.
 */
export function calculateRubricScore(params: {
  completedMissions: number[];
  hypotheses: InvestigationHypothesis[];
  tests: TestExecutionRecord[];
  savedConceptIds: string[];
  consolidations: Record<number, MissionConsolidation>;
}): Record<string, RubricCriteriaScore> {
  const { completedMissions, hypotheses, tests, savedConceptIds, consolidations } = params;

  // 1. Evidências (2.0 pts): baseia-se em testes executados e evidências citadas
  const validTestsCount = tests.length;
  const autoEvidencias = Math.min(2.0, Number(((validTestsCount / 8) * 2.0).toFixed(1)));

  // 2. Hipóteses (2.0 pts): número e qualidade das hipóteses formuladas
  const hypothesesCount = hypotheses.filter(h => h.statement && h.statement.trim().length > 10).length;
  const autoHipoteses = Math.min(2.0, Number(((hypothesesCount / 7) * 2.0).toFixed(1)));

  // 3. Seleção e interpretação dos testes (2.0 pts): interpretações preenchidas
  const interpretationsCount = tests.filter(t => t.interpretation && t.interpretation.trim().length > 8).length;
  const autoTestes = Math.min(2.0, Number(((interpretationsCount / 7) * 2.0).toFixed(1)));

  // 4. Aplicação dos conceitos do modelo OSI (2.0 pts): conceitos do atlas salvos e associados
  const conceptsCount = savedConceptIds.length;
  const autoConceitos = Math.min(2.0, Number(((conceptsCount / 7) * 2.0).toFixed(1)));

  // 5. Revisão e justificativa das soluções (1.0 pt): justificativas preenchidas nas consolidações
  const justificationsCount = Object.values(consolidations).filter(c => c.justificationText && c.justificationText.trim().length > 15).length;
  const autoJustificativas = Math.min(1.0, Number(((justificationsCount / 7) * 1.0).toFixed(1)));

  // 6. Desafio final integrador (1.0 pt)
  const autoDesafioFinal = completedMissions.includes(8) ? 1.0 : 0.0;

  return {
    evidencias: {
      criterionKey: 'evidencias',
      title: 'Interpretação de Evidências',
      maxScore: 2.0,
      autoScore: autoEvidencias,
      status: 'auto'
    },
    hipoteses: {
      criterionKey: 'hipoteses',
      title: 'Formulação de Hipóteses',
      maxScore: 2.0,
      autoScore: autoHipoteses,
      status: 'auto'
    },
    testes: {
      criterionKey: 'testes',
      title: 'Seleção e Interpretação dos Testes',
      maxScore: 2.0,
      autoScore: autoTestes,
      status: 'auto'
    },
    conceitos_osi: {
      criterionKey: 'conceitos_osi',
      title: 'Aplicação dos Conceitos do Modelo OSI',
      maxScore: 2.0,
      autoScore: autoConceitos,
      status: 'auto'
    },
    justificativas: {
      criterionKey: 'justificativas',
      title: 'Revisão e Justificativa das Soluções',
      maxScore: 1.0,
      autoScore: autoJustificativas,
      status: 'auto'
    },
    desafio_final: {
      criterionKey: 'desafio_final',
      title: 'Desafio Final Integrador',
      maxScore: 1.0,
      autoScore: autoDesafioFinal,
      status: 'auto'
    }
  };
}

export function getTotalScore(rubric: Record<string, RubricCriteriaScore>): number {
  let total = 0;
  for (const item of Object.values(rubric)) {
    total += item.teacherScore !== undefined ? item.teacherScore : item.autoScore;
  }
  return Number(total.toFixed(1));
}
