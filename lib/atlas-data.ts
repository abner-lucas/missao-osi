import { LayerInfo } from './types';

export const OSI_STANDARDIZATION_BODIES = [
  {
    category: 'Nacionais',
    organizations: [
      { code: 'ABNT', name: 'Associação Brasileira de Normas Técnicas', country: 'Brasil', role: 'Normas técnicas e cabeamento estruturado nacional' },
      { code: 'ANSI', name: 'American National Standards Institute', country: 'EUA', role: 'Coordenação de padrões voluntários' },
      { code: 'BSI', name: 'British Standards Institution', country: 'Reino Unido', role: 'Pioneira em normas de segurança e qualidade' },
    ]
  },
  {
    category: 'Regionais',
    organizations: [
      { code: 'CEN', name: 'Comité Européen de Normalisation', country: 'Europa', role: 'Padronização para o mercado comum europeu' },
    ]
  },
  {
    category: 'Internacionais',
    organizations: [
      { code: 'ISO', name: 'International Organization for Standardization', role: 'Criadora do modelo de referência OSI (Open Systems Interconnection)' },
      { code: 'ITU / ITU-T', name: 'International Telecommunication Union', role: 'Setor de telecomunicações global e padrões de sinalização' },
    ]
  },
  {
    category: 'Industrial, Comércio ou Profissional',
    organizations: [
      { code: 'IEEE', name: 'Institute of Electrical and Electronics Engineers', role: 'Padrões de redes locais e metropolitanas (802.3 Ethernet, 802.11 Wi-Fi)' },
      { code: 'EIA / TIA', name: 'Electronic Industries Alliance / Telecommunications Industry Association', role: 'Padrões de pinagem e cabeamento (T568A / T568B)' },
      { code: 'IEC', name: 'International Electrotechnical Commission', role: 'Normas eletrotécnicas globais' },
    ]
  }
];

export const OSI_LAYERS_DATA: LayerInfo[] = [
  {
    number: 7,
    namePt: 'Aplicação',
    nameEn: 'Application',
    pdu: 'Dados (Data)',
    summary: 'Fornece serviços de rede diretamente aos programas do usuário (navegadores, clientes de e-mail, transferência de arquivos).',
    color: '#3B82F6', // Blue
    badgeBg: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:border-blue-800 dark:text-blue-300',
    protocols: ['HTTP', 'HTTPS', 'DNS', 'FTP', 'SMTP', 'POP3', 'IMAP', 'SSH', 'TELNET', 'SIP'],
    devices: ['Servidores Web / Arquivos', 'Intermediários de Aplicação', 'Proxy / WAF', 'Navegadores e Clientes'],
    standards: ['RFC 9110 (HTTP)', 'RFC 1035 (DNS)', 'RFC 5321 (SMTP)'],
    keyConcepts: [
      {
        id: 'l7-client-server',
        title: 'Comunicação Cliente-Servidor e Requisições',
        description: 'A aplicação cliente envia uma requisição estruturada com métodos (GET, POST) solicitando um recurso específico, e o servidor responde com um código de status e o conteúdo pedido.',
        realWorldExample: 'Ao acessar https://ifpa.edu.br/portal, o navegador emite um GET HTTP e processa o código retornado.'
      },
      {
        id: 'l7-status-codes',
        title: 'Códigos de Estado HTTP (200 OK vs 404 Not Found)',
        description: 'O código 404 indica que a comunicação nas camadas 1 a 6 funcionou perfeitamente, mas o servidor de aplicação não encontrou o recurso no caminho solicitado.',
        realWorldExample: 'Tentar acessar /notas.html em vez de /boletim.html resulta em HTTP 404.'
      },
      {
        id: 'l7-dns-resolution',
        title: 'Resolução de Nomes DNS',
        description: 'Serviço da camada de aplicação que traduz nomes legíveis (hostnames) em endereços lógicos IP das camadas inferiores.',
        realWorldExample: 'Traduz "ifpa.edu.br" em 200.129.x.x.'
      }
    ]
  },
  {
    number: 6,
    namePt: 'Apresentação',
    nameEn: 'Presentation',
    pdu: 'Dados Formatados / Sintaxe',
    summary: 'Responsável pela tradução de sintaxe, codificação de caracteres (UTF-8, ASCII), compressão e criptografia conceitual.',
    color: '#6366F1', // Indigo
    badgeBg: 'bg-indigo-500/10 text-indigo-700 border-indigo-300 dark:border-indigo-800 dark:text-indigo-300',
    protocols: ['TLS/SSL (conceitual)', 'XDR', 'MIME', 'JPEG', 'TIFF', 'PNG', 'JSON', 'XML'],
    devices: ['Aceleradores Criptográficos', 'Gateways de Tradução de Mídia'],
    standards: ['Unicode (UTF-8)', 'ISO/IEC 8859', 'RFC 5246 (TLS)'],
    keyConcepts: [
      {
        id: 'l6-encoding',
        title: 'Codificação de Caracteres e Texto Embaralhado',
        description: 'Se a origem envia o texto em UTF-8 (que usa mais de um byte para letras acentuadas) e o receptor lê em ISO-8859-1 (um byte por letra), os acentos viram símbolos ilegíveis.',
        realWorldExample: 'A palavra "Apresentação" sendo exibida como "ApresentaÃ§Ã£o" por incompatibilidade de charset.'
      },
      {
        id: 'l6-compression',
        title: 'Compressão e Serialização de Dados',
        description: 'Redução do tamanho dos dados brutos antes da transmissão (GZIP, Brotli) e serialização estruturada (JSON/XML/XDR).',
        realWorldExample: 'Compactação de respostas HTTP reduzindo o consumo de banda de 150KB para 35KB.'
      },
      {
        id: 'l6-crypto',
        title: 'Criptografia e Decodificação Sintática',
        description: 'Garante que os dados estejam protegidos contra interceptação ou formatados de acordo com o padrão esperado pelo receptor.',
        realWorldExample: 'Cifragem simétrica AES-GCM aplicada na carga de dados.'
      }
    ]
  },
  {
    number: 5,
    namePt: 'Sessão',
    nameEn: 'Session',
    pdu: 'Dados / Diálogo',
    summary: 'Gerencia o estabelecimento, sincronização, controle de diálogo e encerramento de conversações entre aplicações.',
    color: '#8B5CF6', // Purple
    badgeBg: 'bg-purple-500/10 text-purple-700 border-purple-300 dark:border-purple-800 dark:text-purple-300',
    protocols: ['NetBIOS', 'RPC', 'PPTP', 'Sockets de Sessão', 'Session Cookies/Tokens'],
    devices: ['Controladores de Sessão', 'Balanceadores com Afinidade de Sessão'],
    standards: ['ITU-T X.225 / ISO 8327'],
    keyConcepts: [
      {
        id: 'l5-dialog-control',
        title: 'Gerenciamento de Diálogo e Sincronização',
        description: 'Permite que duas estações mantenham um diálogo coordenado (simplex, half-duplex ou full-duplex) com pontos de checagem para recuperação de falhas sem reiniciar toda a transmissão.',
        realWorldExample: 'Continuação de download a partir do ponto onde foi interrompido sem baixar o arquivo do início.'
      },
      {
        id: 'l5-session-expiry',
        title: 'Ciclo de Vida de Sessão e Expiração',
        description: 'As sessões possuem identificadores únicos que delimitam a autorização temporal. Se o identificador expira, a aplicação rejeita operações lógicas mesmo com a conexão física e TCP ativas.',
        realWorldExample: 'Mensagem "Sessão expirada: favor autenticar novamente" no portal acadêmico.'
      }
    ]
  },
  {
    number: 4,
    namePt: 'Transporte',
    nameEn: 'Transport',
    pdu: 'Segmento (TCP) / Datagrama (UDP)',
    summary: 'Garante a comunicação fim-a-fim entre processos específicos por meio de portas lógicas, controle de fluxo e confiabilidade.',
    color: '#0EA5E9', // Sky
    badgeBg: 'bg-sky-500/10 text-sky-700 border-sky-300 dark:border-sky-800 dark:text-sky-300',
    protocols: ['TCP', 'UDP', 'SCTP', 'QUIC'],
    devices: ['Firewall com Inspeção de Estado (L4)', 'Load Balancers L4'],
    standards: ['RFC 793 (TCP)', 'RFC 768 (UDP)', 'RFC 9000 (QUIC)'],
    keyConcepts: [
      {
        id: 'l4-ports',
        title: 'Portas Lógicas de Comunicação (0 a 65535)',
        description: 'Identificam o processo ou serviço específico no host. Portas conhecidas (0-1023): HTTP=80, HTTPS=443, SSH=22, DNS=53. Conectar em porta fechada gera TCP RST.',
        realWorldExample: 'O servidor escuta na porta 8080, mas o cliente tenta a porta 80, gerando recusa de conexão.'
      },
      {
        id: 'l4-three-way-handshake',
        title: 'Abertura da Conexão TCP em 3 Etapas',
        description: 'Mecanismo de três vias que sincroniza os números de sequência inicial e aloca buffers nos dois lados antes da troca de dados confiáveis.',
        realWorldExample: 'Cliente envia SYN(seq=100), Servidor responde SYN-ACK(seq=300, ack=101), Cliente confirma com ACK(ack=301).'
      },
      {
        id: 'l4-tcp-vs-udp',
        title: 'Diferença Fundamental: TCP (Confiável) vs UDP (Rápido)',
        description: 'TCP é orientado a conexão com garantia de entrega, retransmissão e controle de fluxo. UDP é não-orientado a conexão, sem garantias nem retransmissões, focado em baixa latência.',
        realWorldExample: 'TCP para páginas web e arquivos; UDP para chamadas de voz e streaming ao vivo.'
      }
    ]
  },
  {
    number: 3,
    namePt: 'Rede',
    nameEn: 'Network',
    pdu: 'Pacote (Packet)',
    summary: 'Responsável pelo endereçamento lógico (IPv4/IPv6) e pelo roteamento de pacotes entre diferentes redes através de roteadores.',
    color: '#10B981', // Emerald
    badgeBg: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-800 dark:text-emerald-300',
    protocols: ['IPv4', 'IPv6', 'ICMP', 'OSPF', 'BGP', 'RIP', 'IPsec', 'NAT'],
    devices: ['Roteadores', 'Switches Layer 3 (Multicamada)', 'Gateways'],
    standards: ['RFC 791 (IPv4)', 'RFC 8200 (IPv6)', 'RFC 792 (ICMP)'],
    keyConcepts: [
      {
        id: 'l3-ip-addressing',
        title: 'Endereçamento Lógico e Máscara de Sub-rede',
        description: 'Identifica a rede e o host (ex: 192.168.10.25/24). Permite determinar se o destino pertence à mesma rede local ou requer um roteador intermediário.',
        realWorldExample: 'Host 192.168.10.25 enviando dados para 10.0.20.10 sabe que o destino está em rede remota.'
      },
      {
        id: 'l3-default-gateway',
        title: 'Roteador de Saída (Gateway Padrão)',
        description: 'Endereço do roteador na rede local para onde todo o tráfego destinado a redes externas deve ser encaminhado. Sem esse endereço configurado, os pacotes para outras redes são descartados no próprio computador.',
        realWorldExample: 'Se o PC tem IP 192.168.10.25/24, o roteador de saída deve ser o endereço do roteador da sala (ex: 192.168.10.1).'
      },
      {
        id: 'l3-routing-table',
        title: 'Tabela de Roteamento e ICMP',
        description: 'Base de decisões do roteador mapeando redes de destino para interfaces de saída e métricas. ICMP é utilizado para testes de diagnóstico (como Ping).',
        realWorldExample: 'Tabela com rota estática "10.0.20.0/24 via 172.16.0.2 porta Gi0/1".'
      }
    ]
  },
  {
    number: 2,
    namePt: 'Enlace',
    nameEn: 'Data Link',
    pdu: 'Quadro (Frame)',
    summary: 'Garante o envio confiável de quadros no enlace físico local, controle de acesso ao meio (MAC), detecção de erros e comutação por switches.',
    color: '#F59E0B', // Amber
    badgeBg: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:border-amber-800 dark:text-amber-300',
    protocols: ['Ethernet (IEEE 802.3)', 'Wi-Fi (IEEE 802.11)', 'PPP', 'ARP', 'HDLC', 'VLAN (802.1Q)'],
    devices: ['Switch Layer 2', 'Placa de Rede (NIC)', 'Access Point (Bridge)', 'Modem'],
    standards: ['IEEE 802.3 (Ethernet)', 'IEEE 802.2 (LLC)'],
    keyConcepts: [
      {
        id: 'l2-mac-address',
        title: 'Endereço Físico MAC (Media Access Control)',
        description: 'Identificador único de 48 bits (6 pares hexadecimais, ex: 00:1A:2B:3C:4D:5E) gravado na placa de rede, válido apenas no segmento de rede local.',
        realWorldExample: 'O switch examina o MAC de destino para encaminhar o quadro exclusivamente para a porta onde o host está conectado.'
      },
      {
        id: 'l2-switch-learning',
        title: 'Tabela MAC (CAM) e Aprendizado do Switch',
        description: 'O switch inspeciona o MAC de origem dos quadros recebidos para mapear portas. Se não conhece o destino, faz flooding (inunda todas as portas exceto a de entrada).',
        realWorldExample: 'Switch associa MAC 00:1A:2B:... à porta Fa0/3 ao receber o primeiro quadro do PC.'
      },
      {
        id: 'l2-fcs-errors',
        title: 'Campos do Quadro e Verificação de Erros',
        description: 'O quadro Ethernet envolve o pacote IP: no início vão os endereços MAC de origem e destino, e no final vai um código de verificação que detecta se algum bit foi corrompido.',
        realWorldExample: 'Se um bit é alterado pelo ruído no cabo, a verificação falha e o quadro é descartado.'
      }
    ]
  },
  {
    number: 1,
    namePt: 'Física',
    nameEn: 'Physical',
    pdu: 'Bit (Sinais)',
    summary: 'Transmite os bits brutos através do meio físico, definindo características elétricas, ópticas, mecânicas, conectores e níveis de tensão.',
    color: '#EF4444', // Red
    badgeBg: 'bg-red-500/10 text-red-700 border-red-300 dark:border-red-800 dark:text-red-300',
    protocols: ['10BASE-T', '100BASE-TX', '1000BASE-T', '10GBASE-SR', 'V.35', 'RS-232', 'DSL'],
    devices: ['Cabos Par Trançado (UTP Cat5e/6)', 'Fibra Óptica', 'Hub', 'Repetidor', 'Conector RJ-45'],
    standards: ['EIA/TIA-568A / 568B', 'IEEE 802.3', 'ABNT NBR 14565'],
    keyConcepts: [
      {
        id: 'l1-medium-vs-connector',
        title: 'Distinção: Meio Físico vs Conector',
        description: 'O meio físico é o condutor (cabo par trançado UTP ou fibra monomodo/multimodo). O RJ-45 é apenas o conector mecânico padronizado na terminação.',
        realWorldExample: 'Um cabo UTP Cat6 usa conectores modulares RJ-45 de 8 vias.'
      },
      {
        id: 'l1-link-status',
        title: 'Indicador de Link Físico (LEDs de Conexão)',
        description: 'Os transceptores da placa de rede e da porta do switch emitem pulsos de link. Sem cabo funcional conectado, o LED de link permanece apagado e bits não trafegam.',
        realWorldExample: 'Cabo desconectado ou rompido internamente resulta em LED Link/Act totalmente apagado.'
      },
      {
        id: 'l1-pinout',
        title: 'Padrão de Pinagem EIA/TIA 568A e 568B',
        description: 'Normas que definem a ordem das 4 cores dos pares de fios nos pinos 1 a 8 do conector RJ-45 para evitar diafonia e perdas elétricas.',
        realWorldExample: 'Padrão T568B: Branco/Laranja, Laranja, Branco/Verde, Azul, Branco/Azul, Verde, Branco/Marrom, Marrom.'
      }
    ]
  }
];

export const ENCAPSULATION_STEPS = [
  {
    stage: 'Aplicação (L7)',
    layerNumber: 7,
    pduName: 'Dados da Aplicação',
    addedHeader: 'Cabeçalho de Aplicação (Ex: HTTP GET /index.html)',
    description: 'A aplicação gera os dados brutos e parâmetros da requisição.',
    fields: [
      { name: 'Método / Comando', value: 'GET /notas.json HTTP/1.1' },
      { name: 'Host Destino', value: 'servidor.ifpa.edu.br' },
      { name: 'User-Agent', value: 'Lab-Redes-Breves/1.0' }
    ]
  },
  {
    stage: 'Apresentação (L6)',
    layerNumber: 6,
    pduName: 'Dados Formatados',
    addedHeader: 'Formato e codificação dos dados (UTF-8)',
    description: 'Os dados recebem codificação padronizada para interpretação universal.',
    fields: [
      { name: 'Codificação', value: 'UTF-8' },
      { name: 'Tipo de conteúdo', value: 'application/json' },
      { name: 'Compressão', value: 'Nenhuma (didático)' }
    ]
  },
  {
    stage: 'Sessão (L5)',
    layerNumber: 5,
    pduName: 'Dados com Contexto de Sessão',
    addedHeader: 'Controle do diálogo e código da sessão',
    description: 'Marcação do canal e identificador de continuidade entre as pontas.',
    fields: [
      { name: 'Código da sessão', value: 'SES-BREVES-2026-99A' },
      { name: 'Modo de Diálogo', value: 'Pergunta e resposta, um de cada vez' }
    ]
  },
  {
    stage: 'Transporte (L4)',
    layerNumber: 4,
    pduName: 'Segmento TCP',
    addedHeader: 'Cabeçalho TCP (Porta Origem + Porta Destino + Seq/Ack)',
    description: 'Segmenta os dados e adiciona portas para endereçar os processos nos hosts.',
    fields: [
      { name: 'Porta Origem', value: '49152 (Efêmera)' },
      { name: 'Porta Destino', value: '80 (HTTP Web Service)' },
      { name: 'Seq Number', value: '1000' },
      { name: 'Flags', value: 'ACK, PSH' }
    ]
  },
  {
    stage: 'Rede (L3)',
    layerNumber: 3,
    pduName: 'Pacote IP',
    addedHeader: 'Cabeçalho IP (IP de origem + IP de destino + tempo de vida + protocolo)',
    description: 'Insere o endereçamento lógico global para roteamento entre redes.',
    fields: [
      { name: 'IP Origem', value: '192.168.10.25 (PC do Aluno)' },
      { name: 'IP Destino', value: '10.0.20.10 (Servidor IFPA)' },
      { name: 'Tempo de vida (saltos)', value: '64' },
      { name: 'Protocolo L4', value: '6 (TCP)' }
    ]
  },
  {
    stage: 'Enlace (L2)',
    layerNumber: 2,
    pduName: 'Quadro Ethernet (Frame)',
    addedHeader: 'Cabeçalho Ethernet (MAC de origem + MAC de destino) + verificação de erros no final',
    description: 'Encapsula o pacote com endereços físicos locais e cauda de detecção de erros.',
    fields: [
      { name: 'MAC Origem', value: '00:1A:2B:3C:4D:5E (NIC Aluno)' },
      { name: 'MAC Destino', value: 'A4:4C:11:89:12:01 (roteador)' },
      { name: 'Conteúdo do quadro', value: 'Pacote IPv4' },
      { name: 'Verificação de erros', value: '0x3F9A1B22' }
    ]
  },
  {
    stage: 'Física (L1)',
    layerNumber: 1,
    pduName: 'Fluxo de Bits',
    addedHeader: 'Codificação Elétrica / Sinais (Preâmbulo 10101010...)',
    description: 'Converte os bits do quadro em sinais físicos transmitidos pelo cabo UTP.',
    fields: [
      { name: 'Sinalização', value: 'Variações de tensão elétrica no cabo' },
      { name: 'Meio Físico', value: 'Cabo de par trançado UTP Cat6' },
      { name: 'Conector', value: 'RJ-45 (8 pinos)' }
    ]
  }
];
