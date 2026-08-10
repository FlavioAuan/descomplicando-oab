'use strict'

/**
 * Classifies the tema and microtema of a question based on its discipline
 * and content, using the OAB edital topic structure.
 *
 * Returns { tema, microtema } — microtema may be empty string.
 */

// ─── TOPIC DEFINITIONS ────────────────────────────────────────────────────────
// Each discipline maps to an ordered list of { tema, microtema, keywords }.
// Scoring: count keywords present in question text → highest score wins.
// Among equal scores, earlier entry wins (more specific first).

const TOPICS = {

  // ── ESTATUTO DA ADVOCACIA E ÉTICA PROFISSIONAL ──────────────────────────────
  'Estatuto da Advocacia e Ética Profissional': [
    {
      tema: 'Honorários Advocatícios',
      microtema: '',
      keywords: [
        'honorários advocatícios','honorários','cláusula de honorários',
        'honorários contratuais','honorários sucumbenciais','tabela de honorários',
        'pagamento de honorários','valor dos honorários','arbitramento de honorários',
      ],
    },
    {
      tema: 'Mandato e Substabelecimento',
      microtema: '',
      keywords: [
        'substabelecimento','substabelecente','substabelecido',
        'mandato judicial','procuração ad judicia','procuração',
        'renúncia ao mandato','renunciar ao mandato','revogação do mandato',
        'mandato do advogado','outorga de poderes',
      ],
    },
    {
      tema: 'Prerrogativas e Imunidades',
      microtema: '',
      keywords: [
        'prerrogativa do advogado','imunidade profissional','prerrogativa',
        'inviolabilidade do escritório','inviolabilidade do advogado',
        'acesso aos autos','direito de vista','comunicação com o cliente',
      ],
    },
    {
      tema: 'Infrações e Sanções Disciplinares',
      microtema: '',
      keywords: [
        'infração disciplinar','infrações disciplinares','sanção disciplinar',
        'censura','suspensão preventiva','exclusão da ordem',
        'processo disciplinar','tribunal de ética','pretensão punitiva',
        'cancelamento da inscrição','punição disciplinar',
      ],
    },
    {
      tema: 'Ética Profissional e Sigilo',
      microtema: '',
      keywords: [
        'sigilo profissional','sigilo','código de ética','ética profissional',
        'confidencialidade','dever de sigilo','publicidade na advocacia',
        'captação de clientela','conflito de interesses',
      ],
    },
    {
      tema: 'Inscrição e Exercício da Advocacia',
      microtema: '',
      keywords: [
        'inscrição na oab','exercício da advocacia','capacidade postulatória',
        'impedimento do advogado','incompatibilidade','anuidade','carteira da oab',
        'cancelamento de inscrição','atividade privativa','postular em juízo',
      ],
    },
    {
      tema: 'Estrutura e Funcionamento da OAB',
      microtema: '',
      keywords: [
        'ordem dos advogados','seccional','conselho federal da oab',
        'conselho seccional','conselho de ética','subseção',
        'eleição da oab','estatuto da advocacia',
      ],
    },
  ],

  // ── DIREITO CONSTITUCIONAL ───────────────────────────────────────────────────
  'Direito Constitucional': [
    {
      tema: 'Controle de Constitucionalidade',
      microtema: 'Ação Direta de Inconstitucionalidade (ADI)',
      keywords: [
        'ação direta de inconstitucionalidade','adi','inconstitucionalidade por omissão',
        'legitimados para adi','efeito vinculante','erga omnes',
        'cláusula de reserva de plenário','reserva de plenário',
      ],
    },
    {
      tema: 'Controle de Constitucionalidade',
      microtema: 'ADPF e ADC',
      keywords: [
        'adpf','arguição de descumprimento de preceito fundamental',
        'ação declaratória de constitucionalidade','adc',
      ],
    },
    {
      tema: 'Controle de Constitucionalidade',
      microtema: 'Controle Difuso',
      keywords: [
        'controle difuso','controle incidental','controle concreto',
        'recurso extraordinário','repercussão geral','controle de constitucionalidade',
        'súmula vinculante',
      ],
    },
    {
      tema: 'Direitos e Garantias Fundamentais',
      microtema: 'Habeas Corpus e Habeas Data',
      keywords: [
        'habeas corpus','habeas data','ordem de habeas corpus',
        'constrangimento ilegal','liberdade de locomoção',
        'coação ilegal','salvo-conduto',
      ],
    },
    {
      tema: 'Direitos e Garantias Fundamentais',
      microtema: 'Mandado de Segurança e Mandado de Injunção',
      keywords: [
        'mandado de segurança','mandado de injunção','direito líquido e certo',
        'ms coletivo','liminar em mandado','impetração de mandado',
      ],
    },
    {
      tema: 'Direitos e Garantias Fundamentais',
      microtema: 'Direitos Individuais (Art. 5º)',
      keywords: [
        'direitos fundamentais','direito à vida','direito à liberdade',
        'igualdade','devido processo legal','contraditório e ampla defesa',
        'liberdade de expressão','liberdade de associação','liberdade de reunião',
        'reunir-se','reuniões','direito de reunião',
        'inviolabilidade','dignidade da pessoa humana',
        'presunção de inocência','princípio da legalidade',
        'convicção filosófica','convicção política',
      ],
    },
    {
      tema: 'Direitos Sociais',
      microtema: '',
      keywords: [
        'direitos sociais','saúde pública','sistema único de saúde','sus',
        'educação','moradia','trabalho','seguridade social',
        'assistência social','previdência social como direito social',
      ],
    },
    {
      tema: 'Direitos Políticos e Nacionalidade',
      microtema: '',
      keywords: [
        'direitos políticos','naturalização','naturalizado','nacionalidade',
        'iniciativa popular','perda dos direitos políticos',
        'reaquisição dos direitos políticos',
      ],
    },
    {
      tema: 'Organização do Estado e Repartição de Competências',
      microtema: '',
      keywords: [
        'competência privativa','competência legislativa concorrente','competência comum',
        'competência da união','estados federados','municípios',
        'repartição de competências','separação dos poderes',
        'intervenção federal','intervenção estadual',
        'assembleias legislativas','assembleia legislativa',
        'organização do estado',
      ],
    },
    {
      tema: 'Processo Legislativo',
      microtema: '',
      keywords: [
        'processo legislativo','emenda constitucional','emendas constitucionais',
        'medida provisória','lei complementar','lei ordinária',
        'decreto legislativo','poder constituinte','câmara dos deputados',
        'senado federal','poder legislativo','iniciativa de lei',
      ],
    },
    {
      tema: 'Poder Executivo',
      microtema: '',
      keywords: [
        'presidente da república','poder executivo',
        'ministro de estado','ministros de estado',
        'vice-presidente','impeachment','crime de responsabilidade',
        'decreto presidencial',
      ],
    },
    {
      tema: 'Poder Judiciário e Funções Essenciais',
      microtema: '',
      keywords: [
        'poder judiciário','stf','stj','tribunais superiores',
        'procurador-geral da república','procurador geral','procuradores-gerais',
        'ministério público','defensoria pública','advocacia-geral da união',
        'foro por prerrogativa de função','prerrogativa de função',
        'funções essenciais à justiça',
      ],
    },
    {
      tema: 'Administração Pública Constitucional',
      microtema: '',
      keywords: [
        'administração pública constitucional','impessoalidade','moralidade',
        'concurso público constitucional','teto constitucional',
        'regime jurídico único','servidor público constitucional',
      ],
    },
    {
      tema: 'Ordem Econômica e Social',
      microtema: '',
      keywords: [
        'ordem econômica','ordem social','livre iniciativa',
        'função social da propriedade','defesa do consumidor constitucional',
        'defesa do meio ambiente constitucional',
        'sistema financeiro nacional constituição',
      ],
    },
    {
      tema: 'Tributação e Orçamento',
      microtema: '',
      keywords: [
        'sistema tributário nacional','orçamento público','lei orçamentária',
        'finanças públicas','tributação constitucional',
      ],
    },
    {
      tema: 'Estado de Defesa e Estado de Sítio',
      microtema: '',
      keywords: [
        'estado de defesa','estado de sítio','defesa do estado',
        'intervenção federal','forças armadas','segurança nacional',
      ],
    },
    {
      tema: 'Teoria Constitucional',
      microtema: '',
      keywords: [
        'poder constituinte','neoconstitucionalismo','normas constitucionais',
        'eficácia das normas','aplicabilidade','histórico das constituições',
        'interpretação constitucional','preâmbulo',
      ],
    },
  ],

  // ── DIREITO ADMINISTRATIVO ───────────────────────────────────────────────────
  'Direito Administrativo': [
    {
      tema: 'Princípios e Fontes do Direito Administrativo',
      microtema: '',
      keywords: [
        'princípios do direito administrativo','legalidade administrativa',
        'impessoalidade','moralidade administrativa','publicidade','eficiência',
        'supremacia do interesse público','indisponibilidade do interesse público',
        'segurança jurídica administrativa','razoabilidade','proporcionalidade',
      ],
    },
    {
      tema: 'Organização Administrativa',
      microtema: 'Administração Direta e Indireta',
      keywords: [
        'autarquia','fundação pública','empresa pública','sociedade de economia mista',
        'administração indireta','administração direta','entidade pública',
        'descentralização administrativa','desconcentração',
        'órgão público','órgãos públicos',
      ],
    },
    {
      tema: 'Organização Administrativa',
      microtema: 'Terceiro Setor e Parcerias',
      keywords: [
        'terceiro setor','organização social','oscip','os','parceria público-privada',
        'ppp','consórcio público','convênio administrativo','protocolo de intenções',
        'contrato de gestão',
      ],
    },
    {
      tema: 'Poderes Administrativos',
      microtema: 'Poder de Polícia',
      keywords: [
        'poder de polícia','polícia administrativa','fiscalização administrativa',
        'ato de polícia','atividade de polícia','auto de infração administrativo',
        'licença administrativa','autorização de funcionamento',
      ],
    },
    {
      tema: 'Poderes Administrativos',
      microtema: 'Poder Hierárquico e Disciplinar',
      keywords: [
        'poder hierárquico','poder disciplinar','processo administrativo disciplinar',
        'pad','sindicância','hierarquia administrativa',
        'subordinação hierárquica','poder de avocação','delegação',
      ],
    },
    {
      tema: 'Poderes Administrativos',
      microtema: 'Discricionariedade e Vinculação',
      keywords: [
        'ato vinculado','ato discricionário','discricionariedade','vinculação',
        'abuso de poder','desvio de poder','desvio de finalidade',
        'mérito administrativo',
      ],
    },
    {
      tema: 'Atos Administrativos',
      microtema: '',
      keywords: [
        'ato administrativo','atos administrativos','atributos do ato',
        'presunção de legitimidade','autoexecutoriedade','imperatividade',
        'espécies de atos','classificação de atos','extinção do ato',
        'revogação','anulação','convalidação','ato nulo',
        'motivação do ato','fundamento do ato',
      ],
    },
    {
      tema: 'Licitações e Contratos Administrativos',
      microtema: '',
      keywords: [
        'licitação','pregão','concorrência pública','tomada de preços','convite',
        'lei 8666','lei 14133','contrato administrativo','regime diferenciado',
        'dispensa de licitação','inexigibilidade','habilitação','proposta',
        'adjudicação','homologação da licitação',
      ],
    },
    {
      tema: 'Serviços Públicos',
      microtema: '',
      keywords: [
        'serviço público','concessão de serviço','permissão administrativa',
        'autorização administrativa','agência reguladora','anatel','aneel','anp',
        'serviço público uti singuli','serviço público uti universi',
        'serviços delegados','serviços concedidos','tarifa','taxa de serviço',
      ],
    },
    {
      tema: 'Agentes Públicos',
      microtema: '',
      keywords: [
        'servidor público','servidores públicos','cargo público','emprego público',
        'agente público','agentes públicos','estabilidade do servidor',
        'teto remuneratório','vacância de cargo','exoneração','demissão de servidor',
        'concurso público','remuneração do servidor','promoção de servidores',
        'policial militar',
      ],
    },
    {
      tema: 'Bens Públicos',
      microtema: '',
      keywords: [
        'bem público','bens públicos','domínio público','afetação','desafetação',
        'bens de uso comum do povo','bens de uso especial','bens dominicais',
        'alienação de bens públicos','uso privativo',
      ],
    },
    {
      tema: 'Intervenção do Estado na Propriedade',
      microtema: '',
      keywords: [
        'desapropriação','tombamento','servidão administrativa','ocupação temporária',
        'requisição administrativa','limitações administrativas',
        'declaração de utilidade pública','indenização por desapropriação',
      ],
    },
    {
      tema: 'Controle da Administração',
      microtema: '',
      keywords: [
        'tribunal de contas','tcu','controle externo','controle legislativo',
        'controle judicial da administração','controle interno',
        'lei anticorrupção','compliance','improbidade administrativa',
        'responsabilidade fiscal','lei de responsabilidade',
      ],
    },
    {
      tema: 'Responsabilidade Civil do Estado',
      microtema: '',
      keywords: [
        'responsabilidade civil do estado','responsabilidade do estado',
        'responsabilidade objetiva','teoria do risco administrativo',
        'teoria do risco integral','direito de regresso',
        'dano causado pelo estado','indenização pelo estado',
        'hospital estadual','hospital psiquiátrico',
        'contratada pelo município','contratada pelo poder público',
      ],
    },
    {
      tema: 'Processo Administrativo',
      microtema: '',
      keywords: [
        'processo administrativo','recurso administrativo','direito de petição',
        'contraditório no processo administrativo','ampla defesa administrativa',
        'lei 9784','prescrição administrativa','saneamento de nulidades',
        'poder público municipal','fundamento do ato administrativo',
      ],
    },
    {
      tema: 'Estatuto da Cidade e Planejamento Urbano',
      microtema: '',
      keywords: [
        'estatuto da cidade','plano diretor','zoneamento','ordenamento urbano',
        'saneamento básico','parcelamento do solo',
      ],
    },
  ],

  // ── DIREITO CIVIL ───────────────────────────────────────────────────────────
  'Direito Civil': [
    {
      tema: 'Pessoa Natural e Personalidade',
      microtema: '',
      keywords: [
        'pessoa natural','personalidade jurídica','capacidade civil',
        'capacidade de fato','capacidade de direito',
        'incapacidade absoluta','incapacidade relativa',
        'nascituro','morte presumida','ausência',
        'direitos da personalidade','nome civil','lgpd',
      ],
    },
    {
      tema: 'Pessoa Jurídica',
      microtema: '',
      keywords: [
        'pessoa jurídica','associação civil','fundação','desconsideração da personalidade',
        'assembleia geral','estatuto social',
      ],
    },
    {
      tema: 'Bens',
      microtema: '',
      keywords: [
        'bens móveis','bens imóveis','bens fungíveis','bens consumíveis',
        'bens divisíveis','benfeitorias','frutos','pertenças','acessão',
      ],
    },
    {
      tema: 'Negócio Jurídico',
      microtema: '',
      keywords: [
        'negócio jurídico','fato jurídico','ato jurídico','elementos do negócio',
        'validade do negócio','nulidade do negócio','anulabilidade',
        'nulidade absoluta','nulidade relativa','ato nulo','ato anulável',
        'vício do consentimento','erro','dolo civil','coação','lesão',
        'estado de perigo','simulação','fraude contra credores',
        'condição','termo','encargo',
      ],
    },
    {
      tema: 'Prescrição e Decadência',
      microtema: '',
      keywords: [
        'prescrição civil','decadência','prazo prescricional','prescrição extintiva',
        'interrupção da prescrição','suspensão da prescrição',
        'prazo decadencial','renúncia à prescrição',
      ],
    },
    {
      tema: 'Teoria Geral das Obrigações',
      microtema: '',
      keywords: [
        'obrigações','solidariedade','solidariamente','obrigação solidária',
        'obrigação de dar','obrigação de fazer','obrigação de não fazer',
        'obrigação alternativa','cessão de crédito','cessão de débito',
        'sub-rogação','novação','compensação','confusão','remissão de dívida',
        'mora','inadimplemento','cláusula penal','arras',
        'transmissão das obrigações','adimplemento',
      ],
    },
    {
      tema: 'Contratos em Geral',
      microtema: '',
      keywords: [
        'contrato','teoria do contrato','formação do contrato','oferta','aceitação',
        'vínculo contratual','extinção do contrato','resolução','resilição',
        'rescisão','condições gerais do contrato',
        'função social do contrato','boa-fé objetiva',
      ],
    },
    {
      tema: 'Contratos em Espécie',
      microtema: '',
      keywords: [
        'contrato de compra e venda','vendedor','comprador',
        'contrato de locação','locatário','locador','aluguel',
        'comodato','comodatário','mútuo','depósito',
        'mandato','fiança','seguro','empreitada',
        'promessa de recompensa','arrendamento',
        'doação','permuta','evicção',
        'ação reivindicatória','ação reinvindicatória',
        'operadora de viagens','pacote de viagem',
      ],
    },
    {
      tema: 'Responsabilidade Civil',
      microtema: '',
      keywords: [
        'responsabilidade civil','dano moral','dano material','indenização',
        'reparação civil','culpa civil','dolo civil',
        'nexo de causalidade','ato ilícito civil',
        'responsabilidade subjetiva','responsabilidade objetiva civil',
        'abuso de direito','teoria do risco criado',
      ],
    },
    {
      tema: 'Posse e Propriedade',
      microtema: '',
      keywords: [
        'posse','propriedade','usucapião','reivindicação',
        'ação possessória','manutenção de posse','reintegração de posse',
        'interdito proibitório','composse','posse direta','posse indireta',
        'domínio','registro de imóvel','escritura de imóvel',
        'ação de vizinhança','dano à propriedade',
        'bem de família',
      ],
    },
    {
      tema: 'Direitos Reais',
      microtema: '',
      keywords: [
        'usufruto','usufrutuário','usufruto vitalício',
        'servidão de passagem','servidão de aqueduto','servidão predial',
        'hipoteca','penhor','anticrese','alienação fiduciária',
        'direitos reais','enfiteuse','superfície',
        'condomínio','condomínio edilício','partes comuns',
        'edifício','apartamento',
      ],
    },
    {
      tema: 'Direito de Família',
      microtema: 'Casamento e União Estável',
      keywords: [
        'casamento','matrimônio','união estável','casar','nupcial',
        'impedimento matrimonial','causas suspensivas',
        'regime de bens','regime de comunhão','regime de separação de bens',
        'separação obrigatória','separação convencional',
        'divórcio','dissolução do casamento',
      ],
    },
    {
      tema: 'Direito de Família',
      microtema: 'Filiação e Adoção',
      keywords: [
        'filiação','parentesco','adoção','poder familiar','guarda judicial',
        'alimentos','pensão alimentícia','obrigação alimentar',
        'multiparentalidade','monoparentalidade',
      ],
    },
    {
      tema: 'Direito das Sucessões',
      microtema: '',
      keywords: [
        'herança','sucessão','testamento','inventário','partilha',
        'herdeiro','legatário','espólio','inventariante',
        'direito sucessório','sucessão legítima','sucessão testamentária',
        'colação','meação','legado',
      ],
    },
  ],

  // ── DIREITO PROCESSUAL CIVIL ─────────────────────────────────────────────────
  'Direito Processual Civil': [
    {
      tema: 'Teoria Geral do Processo',
      microtema: '',
      keywords: [
        'teoria geral do processo','normas processuais','jurisdição',
        'trilogia processual','ação processual','processo',
        'pressupostos processuais','condições da ação',
        'interesse de agir','legitimidade','possibilidade jurídica',
      ],
    },
    {
      tema: 'Competência',
      microtema: '',
      keywords: [
        'competência','fixação de competência','critérios de competência',
        'incompetência absoluta','incompetência relativa',
        'competência territorial','competência funcional','competência em razão da matéria',
        'conflito de competência','foro competente','juízo competente',
      ],
    },
    {
      tema: 'Partes e Intervenção de Terceiros',
      microtema: '',
      keywords: [
        'litisconsórcio','intervenção de terceiros','assistência',
        'denunciação à lide','chamamento ao processo',
        'amicus curiae','substituição processual',
        'desconsideração da personalidade jurídica',
        'partes do processo',
      ],
    },
    {
      tema: 'Petição Inicial e Resposta do Réu',
      microtema: '',
      keywords: [
        'petição inicial','requisitos da petição','emenda da petição',
        'contestação','reconvenção','revelia',
        'pedido','causa de pedir','valor da causa',
        'improcedência liminar',
      ],
    },
    {
      tema: 'Tutela Provisória',
      microtema: '',
      keywords: [
        'tutela antecipada','tutela de urgência','tutela de evidência',
        'liminar','medida cautelar','tutela provisória',
        'fumus boni iuris','periculum in mora',
        'antecipação de tutela','tutela coletiva',
        'arresto','sequestro judicial',
      ],
    },
    {
      tema: 'Provas',
      microtema: '',
      keywords: [
        'prova','ônus da prova','prova documental','prova testemunhal',
        'prova pericial','laudo pericial','confissão',
        'inspeção judicial','direito probatório','inversão do ônus',
      ],
    },
    {
      tema: 'Sentença e Coisa Julgada',
      microtema: '',
      keywords: [
        'sentença','coisa julgada material','coisa julgada formal',
        'efeitos da sentença','julgamento antecipado','decisão judicial',
        'preclusão','trânsito em julgado','antecipação do mérito',
      ],
    },
    {
      tema: 'Recursos',
      microtema: '',
      keywords: [
        'recurso de apelação','agravo de instrumento','embargos de declaração',
        'recurso adesivo','recurso especial','stj',
        'recursos especiais','recurso ordinário','recurso em espécie',
        'recurso extraordinário','teoria geral dos recursos',
        'efeito suspensivo','efeito devolutivo',
        'ação rescisória',
      ],
    },
    {
      tema: 'Execução e Cumprimento de Sentença',
      microtema: '',
      keywords: [
        'cumprimento de sentença','processo de execução','penhora',
        'embargos à execução','título executivo','execução fiscal',
        'arrematação','adjudicação','expropriação',
        'defesas na execução','suspensão da execução',
      ],
    },
    {
      tema: 'Procedimentos Especiais',
      microtema: '',
      keywords: [
        'procedimento especial','ação de despejo','ação possessória',
        'ação de alimentos processual','juizados especiais',
        'ação popular processual','mandado de segurança processual',
        'nunciação de obra nova','ação monitória',
        'uniformização de jurisprudência',
        'incidente de resolução de demandas repetitivas','irdr',
      ],
    },
    {
      tema: 'Processo Coletivo',
      microtema: '',
      keywords: [
        'ação civil pública','processo coletivo','microssistema coletivo',
        'direitos difusos','direitos coletivos','direitos individuais homogêneos',
        'coisa julgada coletiva',
      ],
    },
    {
      tema: 'Citação, Intimação e Prazos',
      microtema: '',
      keywords: [
        'citação','intimação','prazo processual','notificação',
        'ato processual','nulidade processual civil','comunicação processual',
        'processo eletrônico',
      ],
    },
  ],

  // ── DIREITO PENAL ────────────────────────────────────────────────────────────
  'Direito Penal': [
    {
      tema: 'Aplicação da Lei Penal',
      microtema: '',
      keywords: [
        'lei penal no tempo','lei penal no espaço','extraterritorialidade penal',
        'lei penal brasileira','retroatividade da lei penal',
        'lei penal mais benéfica','lei penal mais gravosa',
        'abolitio criminis','novatio legis in mellius',
        'territorialidade','intraterritorialidade',
      ],
    },
    {
      tema: 'Teoria Geral do Crime',
      microtema: 'Tipicidade',
      keywords: [
        'tipicidade','tipo penal','conduta típica','conduta ilícita',
        'dolo penal','culpa penal','tipo doloso','tipo culposo',
        'imputação objetiva','relação de causalidade',
        'crime doloso','crime culposo','crime preterdoloso',
      ],
    },
    {
      tema: 'Teoria Geral do Crime',
      microtema: 'Antijuridicidade e Culpabilidade',
      keywords: [
        'antijuridicidade','culpabilidade','legítima defesa',
        'estado de necessidade','estrito cumprimento do dever legal',
        'exercício regular de direito','excesso de legítima defesa',
        'imputabilidade','semi-imputabilidade','inimputabilidade',
        'erro de tipo','erro de proibição','erro sobre a pessoa',
        'aberratio ictus','aberratio criminis',
      ],
    },
    {
      tema: 'Tentativa e Iter Criminis',
      microtema: '',
      keywords: [
        'tentativa','desistência voluntária','arrependimento eficaz',
        'arrependimento posterior','crime impossível',
        'iter criminis','consumação','execução do crime',
      ],
    },
    {
      tema: 'Concurso de Pessoas e Crimes',
      microtema: '',
      keywords: [
        'concurso de pessoas','coautoria','participação','cumplicidade',
        'concurso de crimes','concurso material','concurso formal',
        'crime continuado','autoria e participação',
      ],
    },
    {
      tema: 'Penas e Extinção da Punibilidade',
      microtema: '',
      keywords: [
        'pena privativa de liberdade','reclusão','detenção',
        'pena de multa','pena restritiva de direitos',
        'aplicação da pena','dosimetria','agravantes','atenuantes',
        'prescrição penal','extinção da punibilidade','extintiva da punibilidade',
        'perdão judicial','graça','anistia','indulto',
        'crime hediondo','regime de cumprimento',
        'progressão de regime','livramento condicional',
      ],
    },
    {
      tema: 'Crimes em Espécie',
      microtema: 'Crimes contra a Pessoa',
      keywords: [
        'homicídio','feminicídio','lesão corporal','lesão corporal culposa',
        'ameaça','sequestro','cárcere privado','constrangimento ilegal penal',
        'disparo de arma','crimes contra a vida',
      ],
    },
    {
      tema: 'Crimes em Espécie',
      microtema: 'Crimes contra o Patrimônio',
      keywords: [
        'furto','roubo','estelionato','extorsão','receptação',
        'apropriação indébita','dano criminal',
        'crime patrimonial','peculato',
      ],
    },
    {
      tema: 'Crimes em Espécie',
      microtema: 'Crimes contra a Dignidade Sexual',
      keywords: [
        'estupro','estupro de vulnerável','vulnerável','relações sexuais',
        'assédio sexual','importunação sexual',
        'crimes contra a dignidade sexual','crimes sexuais',
      ],
    },
    {
      tema: 'Crimes em Espécie',
      microtema: 'Crimes contra a Administração Pública',
      keywords: [
        'peculato','corrupção passiva','corrupção ativa',
        'prevaricação','concussão','emprego irregular',
        'crimes contra a administração','crime funcional',
      ],
    },
    {
      tema: 'Legislação Penal Especial',
      microtema: '',
      keywords: [
        'tráfico de drogas','lei de drogas','lei 11343','entorpecente',
        'lavagem de dinheiro','crime organizado','associação criminosa',
        'porte de arma','arma de fogo','estatuto do desarmamento',
        'pirataria','crimes militares','justiça militar',
        'lei maria da penha','violência doméstica',
        'abuso de autoridade','lei 13869',
        'princípio da insignificância',
        'juizado especial criminal','jecrim','transação penal',
        'infração de menor potencial ofensivo',
      ],
    },
    {
      tema: 'Crimes em Espécie',
      microtema: 'Crimes contra a Fé Pública',
      keywords: [
        'falsidade documental','documento falso','adulteração','falsificação',
        'moeda falsa','uso de documento falso','supressão de documento',
        'estelionato documental',
      ],
    },
    {
      tema: 'Crimes em Espécie',
      microtema: 'Outros Crimes',
      keywords: [
        'aborto','infanticídio','exposição a perigo','omissão de socorro',
        'crime ambiental','crime contra a ordem tributária',
        'crime falimentar','crime de trânsito',
      ],
    },
  ],

  // ── DIREITO PROCESSUAL PENAL ─────────────────────────────────────────────────
  'Direito Processual Penal': [
    {
      tema: 'Inquérito Policial',
      microtema: '',
      keywords: [
        'inquérito policial','investigação criminal','delegado',
        'indiciamento','relatório do inquérito','trancamento de inquérito',
      ],
    },
    {
      tema: 'Ação Penal',
      microtema: '',
      keywords: [
        'ação penal pública','ação penal privada','denúncia','queixa-crime',
        'representação criminal','espécies de ação penal',
        'legitimidade para ação penal','ministério público criminal',
      ],
    },
    {
      tema: 'Provas no Processo Penal',
      microtema: '',
      keywords: [
        'prova ilícita','direito probatório penal','ônus da prova penal',
        'confissão','reconhecimento','acareação','prova criminal',
        'cadeia de custódia','exame de corpo de delito','perícia criminal',
      ],
    },
    {
      tema: 'Prisão e Liberdade Provisória',
      microtema: '',
      keywords: [
        'prisão em flagrante','prisão preventiva','prisão temporária',
        'liberdade provisória','fiança','medidas cautelares penais',
        'auto de prisão em flagrante','relaxamento de prisão',
        'audiência de custódia',
      ],
    },
    {
      tema: 'Procedimentos e Julgamento',
      microtema: '',
      keywords: [
        'tribunal do júri','júri','quesito','soberania do júri',
        'promotor de justiça','acusado','réu','defesa criminal',
        'sentença absolutória','sentença condenatória',
        'nulidade processual penal','procedimento ordinário',
      ],
    },
    {
      tema: 'Recursos no Processo Penal',
      microtema: '',
      keywords: [
        'recurso em sentido estrito','apelação criminal',
        'embargos de declaração penal','revisão criminal',
        'habeas corpus processual penal','recursos penais',
      ],
    },
  ],

  // ── DIREITO DO TRABALHO ───────────────────────────────────────────────────────
  'Direito do Trabalho': [
    {
      tema: 'Relação de Emprego e Contrato de Trabalho',
      microtema: '',
      keywords: [
        'relação de emprego','contrato de trabalho','vínculo empregatício',
        'empregado','empregador','estrutura da relação',
        'subordinação jurídica','pessoalidade','onerosidade','não eventualidade',
        'relação empregatícia','ctps','carteira de trabalho',
      ],
    },
    {
      tema: 'Modalidades de Contrato e Trabalhadores Especiais',
      microtema: '',
      keywords: [
        'contrato por prazo determinado','contrato de experiência',
        'trabalhador temporário','trabalho avulso','trabalhador avulso',
        'aprendiz','estagiário','trabalho doméstico','empregado doméstico',
        'trabalho rural','trabalhador rural',
        'terceirização trabalhista','pejotização',
        'trabalhador autônomo','trabalho intermitente','teletrabalho',
      ],
    },
    {
      tema: 'Jornada de Trabalho e Repouso',
      microtema: '',
      keywords: [
        'jornada de trabalho','horas extras','hora extraordinária',
        'trabalho noturno','adicional noturno','banco de horas',
        'intervalo intrajornada','intervalo interjornada',
        'repouso semanal','feriado','férias trabalhistas','abono pecuniário',
        'turno ininterrupto','compensação de horas',
      ],
    },
    {
      tema: 'Remuneração e Salário',
      microtema: '',
      keywords: [
        'salário','remuneração','equiparação salarial','adicional de insalubridade',
        'adicional de periculosidade','13º salário','gratificação',
        'comissão','gorjeta','parcelas salariais','desvio de função',
        'piso salarial','salário mínimo',
      ],
    },
    {
      tema: 'Cessação do Contrato de Emprego',
      microtema: '',
      keywords: [
        'rescisão contratual','aviso prévio','dispensa','demissão','demissão por justa causa',
        'fgts','multa fgts','aviso prévio proporcional',
        'demissão sem justa causa','estabilidade provisória',
        'gestante','cipeiro','acidente de trabalho',
        'readmissão','reintegração',
      ],
    },
    {
      tema: 'Direito Coletivo do Trabalho',
      microtema: '',
      keywords: [
        'sindicato','negociação coletiva','convenção coletiva','acordo coletivo',
        'dissídio coletivo','greve','lockout','liberdade sindical',
        'categoria profissional','categoria econômica',
        'prevalência do negociado','autonomia coletiva',
      ],
    },
  ],

  // ── DIREITO PROCESSUAL DO TRABALHO ────────────────────────────────────────────
  'Direito Processual do Trabalho': [
    {
      tema: 'Organização e Competência da Justiça do Trabalho',
      microtema: '',
      keywords: [
        'justiça do trabalho','vara do trabalho','trt','tst',
        'competência da justiça do trabalho','justi ça do trabalho',
        'processo trabalhista','juízo trabalhista',
      ],
    },
    {
      tema: 'Reclamação Trabalhista e Audiência',
      microtema: '',
      keywords: [
        'reclamação trabalhista','dissídio individual','petição inicial trabalhista',
        'ata de audiência trabalhista','jus postulandi',
        'rito sumaríssimo','rito ordinário trabalhista',
        'arquivamento trabalhista','revelia trabalhista',
      ],
    },
    {
      tema: 'Provas e Sentença',
      microtema: '',
      keywords: [
        'prova no processo do trabalho','testemunha trabalhista',
        'perícia trabalhista','honorários periciais',
        'sentença trabalhista','honorários advocatícios trabalhistas',
      ],
    },
    {
      tema: 'Recursos Trabalhistas',
      microtema: '',
      keywords: [
        'recurso ordinário trabalhista','recurso de revista','agravo de petição',
        'embargos trabalhistas','embargos de declaração trabalhista',
        'recurso adesivo trabalhista','pressupostos recursais',
        'depósito recursal','custas no processo do trabalho',
        'nulidade trabalhista','nulidade no processo do trabalho',
      ],
    },
    {
      tema: 'Execução Trabalhista',
      microtema: '',
      keywords: [
        'execução trabalhista','penhora trabalhista','embargos à execução trabalhista',
        'liquidação de sentença trabalhista','precatório trabalhista',
        'desconsideração da personalidade jurídica trabalhista',
      ],
    },
    {
      tema: 'Comissão de Conciliação Prévia',
      microtema: '',
      keywords: [
        'comissão de conciliação prévia','conciliação prévia','mediação trabalhista',
        'processo do trabalho','dissídio coletivo trabalhista',
      ],
    },
  ],

  // ── DIREITO EMPRESARIAL ───────────────────────────────────────────────────────
  'Direito Empresarial': [
    {
      tema: 'Empresário e Estabelecimento',
      microtema: '',
      keywords: [
        'empresário individual','registro de empresa','junta comercial',
        'nome empresarial','estabelecimento empresarial',
        'fundo de comércio','ponto comercial','clientela','aviamento',
        'microempreendedor individual','mei',
        'microempresa','empresa de pequeno porte','simples nacional',
      ],
    },
    {
      tema: 'Tipos Societários',
      microtema: '',
      keywords: [
        'sociedade simples','sociedade em comum','sociedade em conta de participação',
        'sociedade empresária','sociedade limitada','ltda','cotista','sócio',
        'eireli','empresa individual de responsabilidade limitada',
        'sociedade cooperativa','cooperativa',
        'dissolução societária','liquidação societária',
        'desconsideração da personalidade jurídica',
      ],
    },
    {
      tema: 'Sociedade Anônima',
      microtema: '',
      keywords: [
        'sociedade anônima','s.a.','ações preferenciais','ações ordinárias',
        'dividendos','assembleia geral de acionistas',
        'companhia aberta','companhia fechada','conselho de administração',
        'sociedades anônimas','valores mobiliários','ações da empresa',
      ],
    },
    {
      tema: 'Operações Societárias',
      microtema: '',
      keywords: [
        'fusão','incorporação societária','cisão societária',
        'transformação societária','concentração econômica',
        'cade','antitruste','posição dominante',
        'controle de concentrações',
      ],
    },
    {
      tema: 'Recuperação Judicial e Falência',
      microtema: '',
      keywords: [
        'falência','recuperação judicial','recuperação extrajudicial',
        'massa falida','credor trabalhista','credor quirografário',
        'administrador judicial','plano de recuperação',
        'estado de insolvência',
      ],
    },
    {
      tema: 'Títulos de Crédito',
      microtema: '',
      keywords: [
        'título de crédito','cheque','nota promissória','letra de câmbio',
        'duplicata','endosso','aval','protesto',
        'cambial','título executivo extrajudicial',
        'abstraticidade','literalidade','cartularidade',
      ],
    },
    {
      tema: 'Propriedade Industrial e Concorrência',
      microtema: '',
      keywords: [
        'marca','patente','propriedade industrial','desenho industrial',
        'concorrência desleal','inpi',
        'defesa da concorrência','infração da ordem econômica',
      ],
    },
    {
      tema: 'Contratos Empresariais',
      microtema: '',
      keywords: [
        'franquia','representação comercial','contrato empresarial',
        'leasing','factoring','alienação fiduciária',
        'lei de liberdade econômica','locação comercial','lei do inquilinato',
      ],
    },
  ],

  // ── DIREITO TRIBUTÁRIO ────────────────────────────────────────────────────────
  'Direito Tributário': [
    {
      tema: 'Princípios Tributários',
      microtema: '',
      keywords: [
        'princípio da legalidade tributária','anterioridade tributária',
        'anterioridade nonagesimal','noventena','irretroatividade tributária',
        'princípio da capacidade contributiva','isonomia tributária',
        'não confisco','não limitação ao tráfego','vedação ao confisco',
      ],
    },
    {
      tema: 'Competência Tributária',
      microtema: '',
      keywords: [
        'competência tributária','competência da união tributária',
        'competência dos estados','competência dos municípios',
        'impostos da união','impostos estaduais','impostos municipais',
        'bitributação','guerra fiscal',
      ],
    },
    {
      tema: 'Imunidade e Isenção Tributária',
      microtema: '',
      keywords: [
        'imunidade tributária','isenção tributária','imunidade recíproca',
        'imunidade de templos','imunidade dos partidos',
        'imunidade de imprensa','benefício fiscal',
        'anistia tributária','remissão tributária',
      ],
    },
    {
      tema: 'Espécies Tributárias',
      microtema: '',
      keywords: [
        'tributo','imposto','taxa','contribuição de melhoria',
        'empréstimo compulsório','contribuição especial',
        'cofins','pis','csll','cide',
        'icms','iss','iptu','ipva','ipi','irpf','irpj','itr','iof','itbi','itcmd',
        'custas judiciais','emolumentos cartorários','tributação',
      ],
    },
    {
      tema: 'Obrigação Tributária',
      microtema: '',
      keywords: [
        'obrigação tributária','fato gerador','hipótese de incidência',
        'base de cálculo','alíquota','sujeito ativo','sujeito passivo',
        'contribuinte','responsável tributário','solidariedade tributária',
        'substituição tributária','domicílio tributário','capacidade tributária',
      ],
    },
    {
      tema: 'Crédito Tributário e Lançamento',
      microtema: '',
      keywords: [
        'crédito tributário','lançamento tributário','lançamento por homologação',
        'lançamento de ofício','lançamento por declaração',
        'suspensão do crédito','extinção do crédito',
        'prescrição tributária','decadência tributária',
        'parcelamento tributário','certidão negativa','dívida ativa tributária',
      ],
    },
    {
      tema: 'Processo Tributário',
      microtema: '',
      keywords: [
        'execução fiscal','auto de infração','notificação fiscal',
        'processo administrativo tributário','embargos à execução fiscal',
        'mandado de segurança tributário','ação anulatória de débito',
        'repetição de indébito','receita federal',
        'simples nacional',
      ],
    },
  ],

  // ── FILOSOFIA DO DIREITO E TEORIA GERAL ────────────────────────────────────
  'Filosofia do Direito e Teoria Geral do Direito': [
    {
      tema: 'Positivismo Jurídico',
      microtema: '',
      keywords: [
        'positivismo jurídico','kelsen','teoria pura do direito',
        'hart','norma jurídica','ordenamento jurídico',
        'teoria do ordenamento jurídico','validade da norma',
        'norma fundamental','legalidade positivista',
      ],
    },
    {
      tema: 'Jusnaturalismo e Ética',
      microtema: '',
      keywords: [
        'jusnaturalismo','direito natural','direito positivo',
        'aristóteles','platão','sócrates','locke','rousseau',
        'hobbes','montesquieu','contrato social',
        'princípio da utilidade','utilitarismo','bentham',
      ],
    },
    {
      tema: 'Teoria do Direito Contemporânea',
      microtema: '',
      keywords: [
        'dworkin','hart','rawls','habermas','arendt','nozick',
        'bobbio','ihering','larenz','kant','hegel',
        'pós-positivismo','neoconstitucionalismo teórico',
        'princípios e regras','ponderação',
      ],
    },
    {
      tema: 'Hermenêutica Jurídica',
      microtema: '',
      keywords: [
        'hermenêutica jurídica','interpretação do direito','hermenêutica aplicada',
        'lacuna no direito','lacunas do direito','lacuna na lei',
        'analogia','costumes','princípios gerais do direito',
        'fontes do direito','integração do direito',
        'fundamento do direito',
      ],
    },
    {
      tema: 'Teoria Geral do Direito',
      microtema: '',
      keywords: [
        'teoria geral do direito','filosofia do direito',
        'historicismo','dialética','fato histórico-cultural',
        'norma e fato','direito objetivo','direito subjetivo',
        'eficácia jurídica','vigência',
      ],
    },
  ],

  // ── DIREITO INTERNACIONAL ────────────────────────────────────────────────────
  'Direito Internacional': [
    {
      tema: 'Direito Internacional Público',
      microtema: '',
      keywords: [
        'direito internacional público','sujeitos do direito internacional',
        'estado soberano','reconhecimento de estado','território',
        'responsabilidade internacional','jus cogens',
        'imunidade diplomática','imunidade consular','consulado',
      ],
    },
    {
      tema: 'Tratados e Convenções Internacionais',
      microtema: '',
      keywords: [
        'tratado internacional','tratados internacionais',
        'convenção de viena','direito dos tratados',
        'ratificação','denúncia de tratado','vigência de tratado',
        'pacta sunt servanda',
      ],
    },
    {
      tema: 'Organizações Internacionais',
      microtema: '',
      keywords: [
        'nações unidas','onu','assembleia geral da onu',
        'conselho de segurança da onu','carta das nações unidas',
        'organização mundial do comércio','omc',
        'mercosul','tratado de assunção',
        'corte internacional de justiça',
        'tribunal penal internacional',
        'interpol',
      ],
    },
    {
      tema: 'Refugiados e Asilo',
      microtema: '',
      keywords: [
        'refugiado','conare','acnur','convenção dos refugiados',
        'asilo político','extradição','expulsão',
      ],
    },
    {
      tema: 'Direito Internacional Privado',
      microtema: '',
      keywords: [
        'direito internacional privado','conflito de leis no espaço',
        'lei de introdução','normas de sobredireito',
        'capital estrangeiro','investimento estrangeiro',
        'controvérsia internacional',
      ],
    },
  ],

  // ── DIREITOS HUMANOS ─────────────────────────────────────────────────────────
  'Direitos Humanos': [
    {
      tema: 'Sistema Internacional de Proteção',
      microtema: '',
      keywords: [
        'direitos humanos','declaração universal dos direitos humanos',
        'sistema interamericano de direitos humanos',
        'corte interamericana de direitos humanos',
        'convenção interamericana','convenção americana sobre direitos humanos',
        'pacto de san josé','pacto internacional',
        'convenção das nações unidas',
        'convenção de genebra','convenções de genebra',
        'direito internacional humanitário',
        'desaparecimento forçado','tortura','convenção contra a tortura',
        'relator especial das nações unidas',
      ],
    },
    {
      tema: 'Sistema Nacional de Proteção',
      microtema: '',
      keywords: [
        'conselho nacional dos direitos humanos','cndh',
        'comissão de direitos humanos','programa nacional de direitos humanos',
        'ouvidoria de direitos humanos','violação de direitos humanos',
        'reparação de danos por violação de direitos humanos',
      ],
    },
    {
      tema: 'Grupos Vulneráveis',
      microtema: '',
      keywords: [
        'grupos vulneráveis','minorias','povos indígenas','quilombolas',
        'pessoas com deficiência','convenção sobre direitos das pessoas com deficiência',
        'pessoas em situação de rua','discriminação racial',
        'convenção sobre a eliminação da discriminação racial',
        'igualdade de gênero','direitos da mulher','cedaw',
      ],
    },
  ],

  // ── DIREITO DO CONSUMIDOR ─────────────────────────────────────────────────────
  'Direito do Consumidor': [
    {
      tema: 'Relação de Consumo e Sujeitos',
      microtema: '',
      keywords: [
        'código de defesa do consumidor','cdc','consumidor','fornecedor',
        'relação de consumo','direito do consumidor',
        'consumidor por equiparação','vulnerabilidade do consumidor',
      ],
    },
    {
      tema: 'Responsabilidade pelo Fato e pelo Vício',
      microtema: '',
      keywords: [
        'vício do produto','vício do serviço','defeito do produto',
        'responsabilidade do fornecedor','fato do produto','fato do serviço',
        'acidente de consumo','dano ao consumidor',
      ],
    },
    {
      tema: 'Práticas Comerciais',
      microtema: '',
      keywords: [
        'práticas abusivas','cláusula abusiva','publicidade enganosa',
        'publicidade abusiva','oferta ao consumidor','cobrança indevida',
        'banco de dados do consumidor','cadastro do consumidor',
        'direito de arrependimento','prazo de arrependimento',
      ],
    },
    {
      tema: 'Proteção Contratual e Tutela',
      microtema: '',
      keywords: [
        'contratos de consumo','nulidade de cláusula abusiva',
        'inversão do ônus da prova consumidor','ação coletiva de consumidor',
        'procon','tutela do consumidor','sistema nacional de defesa do consumidor',
      ],
    },
  ],

  // ── DIREITO DA CRIANÇA E DO ADOLESCENTE ──────────────────────────────────────
  'Direito da Criança e do Adolescente': [
    {
      tema: 'Princípios e Proteção Integral',
      microtema: '',
      keywords: [
        'estatuto da criança e do adolescente','eca','criança e adolescente',
        'proteção integral','prioridade absoluta','doutrina da proteção integral',
        'direitos da criança','direitos do adolescente',
      ],
    },
    {
      tema: 'Medidas de Proteção e Socioeducativas',
      microtema: '',
      keywords: [
        'medida de proteção','medida socioeducativa','menor de idade',
        'adolescente em conflito com a lei','internação de adolescente',
        'liberdade assistida','prestação de serviços à comunidade',
        'semiliberdade','ato infracional',
      ],
    },
    {
      tema: 'Família Substituta e Adoção',
      microtema: '',
      keywords: [
        'adoção','família substituta','guarda de criança','tutela de menor',
        'abrigo','família acolhedora','entidade de acolhimento',
        'conselho tutelar','conselheiro tutelar',
      ],
    },
    {
      tema: 'Poder Judiciário e Ministério Público na Proteção',
      microtema: '',
      keywords: [
        'vara da infância e juventude','juizado da infância','curador especial',
        'ministério público na defesa da criança','defensoria na infância',
        'cadastro nacional de adoção',
      ],
    },
  ],

  // ── DIREITO AMBIENTAL ─────────────────────────────────────────────────────────
  'Direito Ambiental': [
    {
      tema: 'Princípios e Política Nacional do Meio Ambiente',
      microtema: '',
      keywords: [
        'meio ambiente','política ambiental','política nacional do meio ambiente',
        'política pública ambiental','princípio da precaução ambiental',
        'princípio do poluidor-pagador','desenvolvimento sustentável',
        'proteção ambiental','direito ao meio ambiente ecologicamente equilibrado',
      ],
    },
    {
      tema: 'Licenciamento e Avaliação de Impacto',
      microtema: '',
      keywords: [
        'licenciamento ambiental','licença ambiental','licença prévia','licença de instalação',
        'licença de operação','estudo de impacto ambiental','eia','rima',
        'impacto ambiental','sisnama',
      ],
    },
    {
      tema: 'Código Florestal e Áreas Protegidas',
      microtema: '',
      keywords: [
        'código florestal','reserva legal','reservas legais',
        'área de preservação permanente','áreas de preservação permanente',
        'mata atlântica','floresta amazônica','pantanal','cerrado',
        'unidades de conservação','parque nacional','rppn',
        'zona costeira','ecoturismo','ecossistema',
        'área de proteção ambiental',
      ],
    },
    {
      tema: 'Responsabilidade Ambiental',
      microtema: '',
      keywords: [
        'responsabilidade ambiental','dano ambiental','crime ambiental',
        'lei de crimes ambientais','lei 9605','infração ambiental',
        'reparação ambiental','poluição ambiental','poluidor',
        'ação civil pública ambiental','tutela ambiental',
      ],
    },
  ],

  // ── DIREITO ELEITORAL ─────────────────────────────────────────────────────────
  'Direito Eleitoral': [
    {
      tema: 'Sistema Eleitoral e Partidos Políticos',
      microtema: '',
      keywords: [
        'sistema eleitoral','partidos políticos','partido político','fidelidade partidária',
        'fundo partidário','fundo eleitoral','financiamento de campanha',
        'criação de partido','fusão de partidos','incorporação de partido',
        'estatuto do partido','programa do partido',
      ],
    },
    {
      tema: 'Elegibilidade e Inelegibilidade',
      microtema: '',
      keywords: [
        'elegibilidade','inelegível','inelegíveis','elegíveis','inalistável',
        'condições de elegibilidade','causa de inelegibilidade',
        'ficha limpa','lei complementar 135','cargo eletivo',
      ],
    },
    {
      tema: 'Processo Eleitoral',
      microtema: '',
      keywords: [
        'eleições','sufrágio','voto','alistamento eleitoral',
        'registro de candidatura','campanha eleitoral','propaganda eleitoral',
        'pesquisa eleitoral','prestação de contas eleitoral',
        'turno eleitoral','colégio eleitoral',
      ],
    },
    {
      tema: 'Justiça Eleitoral',
      microtema: '',
      keywords: [
        'tribunal superior eleitoral','tse','tribunal regional eleitoral','tre',
        'juízo eleitoral','recurso eleitoral','ação de impugnação de mandato',
        'ação de investigação judicial eleitoral','aije','cassação de mandato',
        'diplomação','crime eleitoral',
      ],
    },
  ],

  // ── DIREITO FINANCEIRO ────────────────────────────────────────────────────────
  'Direito Financeiro': [
    {
      tema: 'Orçamento Público',
      microtema: '',
      keywords: [
        'orçamento público','lei orçamentária anual','loa',
        'lei de diretrizes orçamentárias','ldo',
        'plano plurianual','ppa','ciclo orçamentário',
        'elaboração do orçamento','aprovação do orçamento',
        'execução orçamentária','crédito orçamentário',
        'crédito adicional','crédito suplementar','crédito especial','crédito extraordinário',
      ],
    },
    {
      tema: 'Lei de Responsabilidade Fiscal',
      microtema: '',
      keywords: [
        'lei de responsabilidade fiscal','lrf','lei complementar 101',
        'responsabilidade fiscal','equilíbrio fiscal',
        'despesa com pessoal','limite de gastos','limite de pessoal',
        'resultado primário','resultado nominal',
        'renúncia de receita','compensação fiscal',
      ],
    },
    {
      tema: 'Receitas e Despesas Públicas',
      microtema: '',
      keywords: [
        'receita pública','despesa pública','receita corrente líquida',
        'receitas originárias','receitas derivadas','tributo como receita',
        'despesa obrigatória','despesa discricionária',
        'empenho','liquidação','pagamento','estágios da despesa',
      ],
    },
    {
      tema: 'Crédito e Dívida Pública',
      microtema: '',
      keywords: [
        'crédito público','dívida pública','dívida consolidada',
        'dívida mobiliária','operações de crédito','precatório',
        'títulos da dívida pública','tesouro nacional',
        'finanças públicas','sistema financeiro público',
      ],
    },
  ],

  // ── DIREITO PREVIDENCIÁRIO ────────────────────────────────────────────────────
  'Direito Previdenciário': [
    {
      tema: 'Seguridade Social',
      microtema: '',
      keywords: [
        'seguridade social','previdência social','saúde','assistência social',
        'financiamento da seguridade','contribuição previdenciária',
        'custeio da previdência','regime geral de previdência social','rgps',
      ],
    },
    {
      tema: 'Benefícios Previdenciários',
      microtema: '',
      keywords: [
        'inss','aposentadoria','aposentadoria por idade','aposentadoria por invalidez',
        'aposentadoria por tempo de contribuição','aposentadoria especial',
        'auxílio-doença','benefício por incapacidade temporária',
        'auxílio-acidente','salário-maternidade','pensão por morte',
        'salário-família','benefício de prestação continuada','bpc',
        'benefício previdenciário','carência previdenciária',
      ],
    },
    {
      tema: 'Segurados e Dependentes',
      microtema: '',
      keywords: [
        'segurado obrigatório','segurado facultativo','segurado especial',
        'contribuinte individual','empregado previdenciário',
        'dependente previdenciário','classe de dependentes',
        'tempo de contribuição','qualidade de segurado','período de graça',
      ],
    },
    {
      tema: 'Regimes Próprios e Previdência Complementar',
      microtema: '',
      keywords: [
        'regime próprio de previdência','rpps','servidor público previdência',
        'previdência complementar','entidade fechada de previdência',
        'efpc','funpresp','reforma da previdência','emenda 103',
        'doença ocupacional','acidente de trabalho previdência',
      ],
    },
  ],
}

// ─── CLASSIFIER ──────────────────────────────────────────────────────────────

// Short names used as fallback tema when no topic keyword matches
const DISCIPLINE_FALLBACK = {
  'Estatuto da Advocacia e Ética Profissional': 'Ética e Estatuto da Advocacia',
  'Direito Constitucional': 'Direito Constitucional Geral',
  'Direito Administrativo': 'Direito Administrativo Geral',
  'Direito Civil': 'Direito Civil Geral',
  'Direito Processual Civil': 'Processo Civil Geral',
  'Direito Penal': 'Direito Penal Geral',
  'Direito Processual Penal': 'Processo Penal Geral',
  'Direito do Trabalho': 'Direito do Trabalho Geral',
  'Direito Processual do Trabalho': 'Processo do Trabalho Geral',
  'Direito Empresarial': 'Direito Empresarial Geral',
  'Direito Tributário': 'Direito Tributário Geral',
  'Filosofia do Direito e Teoria Geral do Direito': 'Filosofia e Teoria do Direito',
  'Direito Internacional': 'Direito Internacional Geral',
  'Direitos Humanos': 'Direitos Humanos Geral',
  'Direito do Consumidor': 'Direito do Consumidor Geral',
  'Direito da Criança e do Adolescente': 'Direito da Criança e do Adolescente Geral',
  'Direito Ambiental': 'Direito Ambiental Geral',
  'Direito Eleitoral': 'Direito Eleitoral Geral',
  'Direito Financeiro': 'Direito Financeiro Geral',
  'Direito Previdenciário': 'Direito Previdenciário Geral',
}

function classifyTema(text, discipline) {
  const topics = TOPICS[discipline]
  if (!topics || topics.length === 0) return { tema: '', microtema: '' }

  const lower = text.toLowerCase().replace(/  +/g, ' ')
  let bestScore = 0
  let bestTema = ''
  let bestMicrotema = ''

  for (const entry of topics) {
    let score = 0
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestTema = entry.tema
      bestMicrotema = entry.microtema
    }
  }

  // Fallback: if nothing matched, use discipline-level generic tema
  if (!bestTema) {
    bestTema = DISCIPLINE_FALLBACK[discipline] || discipline
  }

  return { tema: bestTema, microtema: bestMicrotema }
}

/**
 * Determines the best matching discipline for a given text by scoring
 * keywords across all 20 disciplines. Returns the discipline name and
 * its classifyTema result.
 *
 * @param {string} text - question statement + alternatives combined
 * @param {string} [hintDiscipline] - current discipline to use as tiebreaker
 * @returns {{ discipline: string, tema: string, microtema: string }}
 */
function classifyAll(text, hintDiscipline) {
  const lower = text.toLowerCase().replace(/  +/g, ' ')

  let bestDiscipline = hintDiscipline || ''
  let bestScore = 0
  let bestTema = ''
  let bestMicrotema = ''

  for (const [discipline, topicList] of Object.entries(TOPICS)) {
    let discScore = 0
    let topicBestScore = 0
    let topicBestTema = ''
    let topicBestMicrotema = ''

    for (const entry of topicList) {
      let score = 0
      for (const kw of entry.keywords) {
        if (lower.includes(kw)) score++
      }
      discScore += score
      if (score > topicBestScore) {
        topicBestScore = score
        topicBestTema = entry.tema
        topicBestMicrotema = entry.microtema
      }
    }

    if (discScore > bestScore || (discScore === bestScore && discipline === hintDiscipline)) {
      bestScore = discScore
      bestDiscipline = discipline
      bestTema = topicBestTema
      bestMicrotema = topicBestMicrotema
    }
  }

  // If nothing matched at all, fall back to hint or first discipline
  if (!bestDiscipline) {
    bestDiscipline = hintDiscipline || Object.keys(TOPICS)[0]
  }

  // If we have the discipline but no tema matched, use fallback
  if (!bestTema) {
    bestTema = DISCIPLINE_FALLBACK[bestDiscipline] || bestDiscipline
  }

  return { discipline: bestDiscipline, tema: bestTema, microtema: bestMicrotema }
}

module.exports = { classifyTema, classifyAll }
