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
    subtitle: 'Onde o sinal se perde entre o computador e a rede?',
    initialProblemDescription: 'O computador do laboratório não consegue transmitir nenhum bit para a rede local. Nenhum sinal luminoso está presente no conector de rede.',
    initialTopologySymptoms: [
      'LED Link/Act da placa de rede do PC está totalmente APAGADO',
      'A porta do switch ligada ao PC não detecta sinal elétrico',
      'A placa de rede não recebe os pulsos que indicam conexão'
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
        label: 'Verificar o sinal elétrico do link',
        category: 'fisico',
        description: 'Mede se há pulsos elétricos nos pinos 1-2 e 3-6 do conector RJ-45.',
        execute: (state) => {
          if (!state.cableConnected) {
            return {
              output: '[TESTE FÍSICO] Tensão nos pinos: 0.0V. Status: LINK DOWN. Ausência de continuidade elétrica.',
              success: false,
              diagnosticCode: 'PHY_ERR_NO_CARRIER'
            };
          }
          return {
            output: '[TESTE FÍSICO] Tensão nos pinos: 2.5V. Status: LINK UP a 1 Gbit/s. Link ESTÁVEL.',
            success: true,
            diagnosticCode: 'PHY_OK_LINK_UP'
          };
        }
      },
      {
        key: 'test_cable_continuity',
        label: 'Teste de Continuidade e Pinagem T568B',
        category: 'fisico',
        description: 'Envia um sinal de teste pelo cabo de par trançado para ver se algum par está rompido.',
        execute: (state) => {
          if (!state.cableConnected) {
            return {
              output: '[CONTINUIDADE] Circuito ABERTO no conector: o sinal não chega ao outro lado. Cabo desconectado da porta RJ-45.',
              success: false,
              diagnosticCode: 'PHY_ERR_OPEN_CIRCUIT'
            };
          }
          return {
            output: '[CONTINUIDADE] Pares 1-2, 3-6, 4-5 e 7-8 verificados. Perda de sinal dentro do padrão T568B.',
            success: true,
            diagnosticCode: 'PHY_OK_CABLE_PASS'
          };
        }
      }
    ],
    interventions: [
      {
        key: 'reconnect_cable',
        label: 'Conectar e travar o cabo RJ-45 na porta',
        description: 'Encaixa o conector RJ-45 até travar na porta da placa de rede.',
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
    subtitle: 'Os quadros saem do computador, mas não chegam aonde deveriam',
    initialProblemDescription: 'Com o link físico restabelecido, o computador envia quadros Ethernet, mas eles não chegam ao destino na rede local.',
    initialTopologySymptoms: [
      'Quadro Ethernet emitido com MAC destino desconhecido',
      'A tabela MAC do switch não tem registro do computador de destino',
      'O switch precisa aprender em qual porta está cada endereço MAC'
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
        label: 'Consultar a tabela MAC do switch',
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
            output: '[TABELA MAC] Porta Fa0/1: 00:1A:2B:3C:4D:5E (PC) | Porta Fa0/24: A4:4C:11:89:12:01 (roteador). Mapeado com sucesso.',
            success: true,
            diagnosticCode: 'MAC_TABLE_RESOLVED'
          };
        }
      },
      {
        key: 'test_frame_fcs',
        label: 'Inspecionar o cabeçalho e o final do quadro',
        category: 'enlace',
        description: 'Confere se o quadro chegou inteiro e quais são os endereços MAC de origem e destino.',
        execute: (state) => {
          if (!state.switchPortLearned) {
            return {
              output: '[INSPEÇÃO DE QUADRO] Conteúdo: pacote IP | Verificação de erros: OK | MAC de destino não encontrado na rede local.',
              success: false,
              diagnosticCode: 'FRAME_TARGET_UNREACHABLE'
            };
          }
          return {
            output: '[INSPEÇÃO DE QUADRO] MAC Origem: 00:1A:2B:3C:4D:5E | MAC Destino: A4:4C:11:89:12:01 | Verificação de erros: OK (quadro íntegro).',
            success: true,
            diagnosticCode: 'FRAME_SUCCESS_DELIVERED'
          };
        }
      }
    ],
    interventions: [
      {
        key: 'resolve_mac_mapping',
        label: 'Fazer o switch aprender o MAC do roteador',
        description: 'Envia um quadro de aprendizado para o switch registrar o MAC do roteador na porta Fa0/24.',
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
    subtitle: 'Por que o pacote não sai da rede local?',
    initialProblemDescription: 'O computador alcança outros computadores da rede local 192.168.10.0/24, mas não consegue acessar o servidor educacional na rede remota 10.0.20.10. O pacote é descartado antes de alcançar o roteador.',
    initialTopologySymptoms: [
      'Ping para 192.168.10.2 (mesma sub-rede) RESPONDE com sucesso',
      'Ping para 10.0.20.10 (rede remota) falha com "Rede de destino inacessível"',
      'Configuração IP do PC: roteador de saída ausente (0.0.0.0)'
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
        description: 'Envia pacotes de teste (ping) para um computador da mesma rede local.',
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
        description: 'Envia pacotes de teste (ping) para o servidor, que fica em outra rede.',
        execute: (state) => {
          if (state.pcGateway !== '192.168.10.1') {
            return {
              output: 'PING 10.0.20.10: Host 192.168.10.25 informa: Destino inacessível (o PC não sabe por qual roteador sair da rede).',
              success: false,
              diagnosticCode: 'ICMP_NO_GATEWAY'
            };
          }
          return {
            output: 'PING 10.0.20.10: Resposta de 10.0.20.10: bytes=32 tempo=12ms (encaminhado pelo roteador 192.168.10.1).',
            success: true,
            diagnosticCode: 'ICMP_REMOTE_SUCCESS'
          };
        }
      },
      {
        key: 'test_traceroute',
        label: 'Rastrear o caminho dos pacotes (traceroute)',
        category: 'rede',
        description: 'Mostra cada equipamento por onde o pacote passa até o servidor.',
        execute: (state) => {
          if (state.pcGateway !== '192.168.10.1') {
            return {
              output: 'traceroute 10.0.20.10:\n 1  * * * Falha: PC não sabe para onde despachar pacotes fora da sub-rede.',
              success: false,
              diagnosticCode: 'TRACE_FAIL_FIRST_HOP'
            };
          }
          return {
            output: 'traceroute 10.0.20.10:\n 1  192.168.10.1 (roteador de saída) 1.1ms\n 2  10.0.20.10 (Servidor Educacional) 11.4ms',
            success: true,
            diagnosticCode: 'TRACE_SUCCESS_TWO_HOPS'
          };
        }
      }
    ],
    interventions: [
      {
        key: 'set_correct_gateway',
        label: 'Configurar o roteador de saída (gateway) como 192.168.10.1',
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
    subtitle: 'O pacote chega ao servidor, mas a conexão é recusada',
    initialProblemDescription: 'Os pacotes IP agora chegam ao servidor 10.0.20.10, mas a aplicação educacional recebe uma recusa imediata da conexão TCP.',
    initialTopologySymptoms: [
      'Cliente tentando conexão TCP na porta de destino 8080',
      'O servidor responde com um aviso de conexão recusada (RST)',
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
        label: 'Acompanhar a abertura da conexão TCP (3 etapas)',
        category: 'transporte',
        description: 'Mostra as mensagens que cliente e servidor trocam para abrir a conexão.',
        execute: (state) => {
          if (state.tcpPortTarget !== 80) {
            return {
              output: 'TENTATIVA TCP Porta ' + state.tcpPortTarget + ':\n 1. [CLIENTE -> SERVIDOR] pedido de conexão (SYN)\n 2. [SERVIDOR -> CLIENTE] recusa (RST): nenhum programa atende nesta porta.',
              success: false,
              diagnosticCode: 'TCP_CONNECTION_REFUSED_RST'
            };
          }
          return {
            output: 'TENTATIVA TCP Porta 80:\n 1. [CLIENTE -> SERVIDOR] pedido de conexão (SYN)\n 2. [SERVIDOR -> CLIENTE] aceite (SYN-ACK)\n 3. [CLIENTE -> SERVIDOR] confirmação (ACK)\n STATUS: conexão estabelecida.',
            success: true,
            diagnosticCode: 'TCP_HANDSHAKE_ESTABLISHED'
          };
        }
      },
      {
        key: 'test_netstat_services',
        label: 'Ver quais portas o servidor está atendendo',
        category: 'transporte',
        description: 'Lista os programas do servidor e as portas em que cada um aguarda conexões.',
        execute: () => ({
          output: 'SERVIÇOS ATIVOS EM 10.0.20.10:\n - TCP porta 80: atendendo (servidor web do IFPA)\n - TCP porta 22: atendendo (acesso remoto)\n (A porta 8080 não aparece na lista).',
          success: true,
          diagnosticCode: 'NETSTAT_PORT_80_LISTENING'
        })
      }
    ],
    interventions: [
      {
        key: 'change_tcp_port_80',
        label: 'Ajustar Porta de Destino do Serviço para 80 (HTTP)',
        description: 'Faz o cliente se conectar na porta em que o servidor web realmente atende.',
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
    subtitle: 'O servidor responde, mas não reconhece a conversa',
    initialProblemDescription: 'A conexão TCP está estabelecida e confiável, mas as solicitações de transação do aluno são rejeitadas pelo servidor com aviso de sessão inválida ou desincronizada.',
    initialTopologySymptoms: [
      'Segmentos TCP chegam intactos e confirmados',
      'A camada de sessão rejeita as mensagens: o código da sessão expirou no servidor',
      'É preciso retomar o diálogo e renovar a sessão'
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
              output: '[SESSÃO OSI] Código da sessão: "SES-2026-EXPIRED". Status: DIÁLOGO RECUSADO. O tempo limite expirou.',
              success: false,
              diagnosticCode: 'SESSION_EXPIRED_OR_DESYNC'
            };
          }
          return {
            output: '[SESSÃO OSI] Código da sessão: "SES-BREVES-2026-ACTIVE". Status: DIÁLOGO SINCRONIZADO.',
            success: true,
            diagnosticCode: 'SESSION_SYNCED_OK'
          };
        }
      }
    ],
    interventions: [
      {
        key: 'renew_session_token',
        label: 'Renovar o código da sessão',
        description: 'Pede ao servidor um novo código de sessão para retomar o diálogo.',
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
    subtitle: 'A página chega, mas o texto vem embaralhado',
    initialProblemDescription: 'Os dados da resposta do servidor chegam ao laboratório, porém o texto da página acadêmica é exibido com caracteres corrompidos ("AvaliaÃ§Ã£o de Redes no Campus Breves").',
    initialTopologySymptoms: [
      'O texto chega com caracteres trocados e símbolos estranhos',
      'O servidor gerou o texto em UTF-8, que usa mais de um byte para letras acentuadas',
      'O computador do aluno está lendo o texto em outro padrão, o ISO-8859-1'
    ],
    initialState: {
      missionNumber: 6,
      isResolved: false,
      dataEncoding: 'ISO-8859-1'
    },
    availableTests: [
      {
        key: 'test_byte_charset',
        label: 'Comparar os bytes recebidos com o texto exibido',
        category: 'apresentacao',
        description: 'Mostra os bytes que chegaram e como eles foram transformados em letras.',
        execute: (state) => {
          if (state.dataEncoding !== 'UTF-8') {
            return {
              output: 'BYTES RECEBIDOS: [0x41, 0x76, 0x61, 0x6C, 0x69, 0x61, 0xC3, 0xA7, 0xC3, 0xA3, 0x6F]\n DECODIFICAÇÃO ATUAL (ISO-8859-1): "AvaliaÃ§Ã£o"\n DIAGNÓSTICO: os bytes 0xC3 0xA7 viraram dois símbolos, em vez de um único "ç".',
              success: false,
              diagnosticCode: 'PRESENTATION_MOJIBAKE_DETECTED'
            };
          }
          return {
            output: 'BYTES RECEBIDOS: [0x41, 0x76, 0x61, 0x6C, 0x69, 0x61, 0xC3, 0xA7, 0xC3, 0xA3, 0x6F]\n DECODIFICAÇÃO ATUAL (UTF-8): "Avaliação"\n DIAGNÓSTICO: texto correto, com acentos exibidos normalmente.',
            success: true,
            diagnosticCode: 'PRESENTATION_UTF8_RESOLVED'
          };
        }
      }
    ],
    interventions: [
      {
        key: 'set_encoding_utf8',
        label: 'Ler o texto no padrão UTF-8',
        description: 'Ajusta a camada de apresentação para traduzir os bytes no mesmo padrão usado pelo servidor.',
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
    subtitle: 'O servidor responde, mas não entrega a página pedida',
    initialProblemDescription: 'Toda a infraestrutura de rede, transporte, sessão e apresentação está operacional. O navegador simulado envia a requisição HTTP GET para "/notas.html", mas o servidor responde com código 404 Not Found.',
    initialTopologySymptoms: [
      'Conexão nas camadas 1 a 6 bem-sucedida',
      'Resposta HTTP recebida: código 404 Not Found (não encontrado)',
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
        label: 'Enviar o pedido HTTP e ver a resposta',
        category: 'aplicacao',
        description: 'Pede a página ao servidor e mostra o código de resposta e o conteúdo recebido.',
        execute: (state) => {
          if (state.targetResourceUri !== '/boletim.html') {
            return {
              output: 'HTTP/1.1 404 Not Found\n Content-Type: text/html\n Server: IFPA-Web/2.4\n Conteúdo: <h1>404 Recurso Não Encontrado: ' + state.targetResourceUri + '</h1>\n (A comunicação de rede funcionou, mas o recurso solicitado não existe no servidor).',
              success: false,
              diagnosticCode: 'HTTP_404_NOT_FOUND'
            };
          }
          return {
            output: 'HTTP/1.1 200 OK\n Content-Type: text/html; charset=UTF-8\n Content-Length: 1420\n Conteúdo: <h1>Portal do Aluno - Boletim Oficial do IFPA Campus Breves</h1><p>Situação: Regular</p>',
            success: true,
            diagnosticCode: 'HTTP_200_OK'
          };
        }
      },
      {
        key: 'test_directory_listing',
        label: 'Consultar Lista de Recursos Disponíveis no Servidor',
        category: 'aplicacao',
        description: 'Mostra a lista de páginas que o servidor web oferece.',
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
        label: 'Corrigir o endereço da página para "/boletim.html"',
        description: 'Troca o endereço pedido no HTTP pela página que existe no servidor.',
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
    subtitle: 'Uma nova estação e mais de uma falha no caminho',
    initialProblemDescription: 'Uma segunda estação de trabalho do laboratório (PC-2: 192.168.10.30) alcança o roteador, mas não consegue usar o sistema de notas. Mais de uma camada pode estar envolvida.',
    initialTopologySymptoms: [
      'O PC-2 tenta se conectar na porta TCP 443, que o servidor não atende',
      'O servidor recusa a conexão na porta 443; o serviço está na porta 80',
      'O sistema de notas envia texto em UTF-8, mas o PC-2 está configurado para ler só ASCII (sem acentos)'
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
        label: 'Camada 4: testar a conexão TCP do PC-2',
        category: 'transporte',
        description: 'Tenta abrir uma conexão na porta configurada no PC-2.',
        execute: (state) => {
          if (!state.secondaryServicePortOk) {
            return {
              output: '[PC-2 TCP] Pedido de conexão para 10.0.20.10:443 -> recusado (RST). Nenhum programa atende na porta 443.',
              success: false,
              diagnosticCode: 'INT_L4_FAIL'
            };
          }
          return {
            output: '[PC-2 TCP] Pedido de conexão para 10.0.20.10:80 -> aceito. Conexão TCP estabelecida na camada 4.',
            success: true,
            diagnosticCode: 'INT_L4_OK'
          };
        }
      },
      {
        key: 'test_diag_pc2_presentation',
        label: 'Camada 6: ver como o PC-2 lê os caracteres',
        category: 'apresentacao',
        description: 'Verifica se os bytes da resposta são interpretados corretamente.',
        execute: (state) => {
          if (!state.secondaryEncodingOk) {
            return {
              output: '[PC-2 CAMADA 6] Letras acentuadas não existem na tabela ASCII e aparecem como pontos de interrogação (????).',
              success: false,
              diagnosticCode: 'INT_L6_FAIL'
            };
          }
          return {
            output: '[PC-2 CAMADA 6] Leitura ajustada para UTF-8. Acentuação e pontuação corretas.',
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
        label: 'Ler o texto em UTF-8 no PC-2 (Camada 6 - Apresentação)',
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
      title: 'Formulação de Suspeitas',
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
