'use strict'

/**
 * Builds the "Ética — Treinamento pelo Ebook" training from the Descomplicando
 * OAB ebook (.docx) and writes it as a data migration.
 *
 *   node scripts/build-etica-training.js "<caminho do ebook.docx>"
 *
 * One training day per ebook chapter, each with:
 *   - Leitura (apostila with the chapter text)
 *   - Questões comentadas do ebook (exercise set, with the ebook's comments)
 *   - Questões de provas anteriores (exercise set copied from exam_questions
 *     classified into the chapter's ebook topic; dropped when there are none)
 *   - Flashcards (pegadinhas da FGV + frases da revisão de véspera)
 *
 * The .docx is copied to content/ebooks (private, see migration 0008) and registered as a knowledge file,
 * with one knowledge chunk per section so the AI tutor can use it.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const mammoth = require('mammoth')
const cheerio = require('cheerio')

const ROOT = path.join(__dirname, '..')
const DOCX = process.argv[2] || path.join(ROOT, '..', 'Ebook Etica - Descomplicando OAB.docx')
const MIGRATION = path.join(ROOT, 'src/lib/db/migrations/0004_etica_ebook_training.sql')
const PUBLIC_FILE = 'materiais/ebook-etica-descomplicando-oab.docx'
const FILE_URL = '/' + PUBLIC_FILE

const SUBJECT = 'Estatuto da Advocacia e Ética Profissional'
const TRAINING_NAME = 'Ética OAB — Treinamento pelo Ebook Descomplicando OAB'
const START_DATE = '2026-10-26'

// ─── Revisão de véspera as flashcards (chapter number → cards) ────────────────

const VESPERA = [
  [1, 'Há hierarquia entre advogado, juiz e promotor? Como ficam os advogados nas audiências?', 'Não há hierarquia. Nas audiências, os advogados das partes ficam no mesmo plano topográfico e equidistantes do juiz (EAOAB, art. 6º).'],
  [1, 'Autos sigilosos de investigação: o advogado precisa de procuração? O que a autoridade pode limitar?', 'Sim, só com procuração. A autoridade limita apenas diligências em andamento e ainda não documentadas (art. 7º, §§ 10 e 11).'],
  [1, 'Quais os requisitos para a busca no escritório do advogado?', 'Decisão judicial motivada, indícios de crime do próprio advogado, mandado específico e pormenorizado e representante da OAB presente (art. 7º, § 6º).'],
  [1, 'O advogado pode fazer colaboração premiada contra cliente ou ex-cliente?', 'Não. A violação gera processo disciplinar e a pena pode chegar à exclusão (art. 7º, § 6º-I).'],
  [1, 'Prisão do advogado: o que se exige quando o motivo é ligado à profissão? E quando não é?', 'Ligado à profissão: só flagrante de crime inafiançável e com representante da OAB. Sem relação com a profissão: basta comunicar a Seccional.'],
  [1, 'Até quando o advogado tem direito à sala de Estado-Maior? E se não houver?', 'Só antes do trânsito em julgado. Na falta da sala, prisão domiciliar.'],
  [1, 'Quais direitos têm a advogada gestante e a adotante ou que deu à luz?', 'Gestante: entra sem detector de metais e tem vaga na garagem. Adotante ou que deu à luz, sendo a única patrona: prazos processuais suspensos (art. 7º-A).'],
  [1, 'Quem pode provocar o desagravo público? O ofendido pode dispensá-lo?', 'É promovido de ofício ou a pedido de qualquer pessoa. O ofendido não pode dispensá-lo.'],
  [1, 'A imunidade profissional do advogado alcança quais crimes?', 'Injúria e difamação — nunca calúnia ou desacato.'],
  [2, 'Sem estipulação sobre a forma de pagamento, como são pagos os honorários?', '1/3 no início, 1/3 até a decisão de primeira instância e 1/3 no final (art. 22, § 3º).'],
  [2, 'Em quanto tempo prescreve a cobrança de honorários? E a prestação de contas contra o advogado?', 'Ambas em 5 anos (arts. 25 e 25-A).'],
  [2, 'Bloqueio universal de bens do cliente: quanto o advogado pode liberar para honorários? Há exceção?', 'Até 20% dos bens, salvo nas causas da Lei de Drogas (art. 24-A).'],
  [2, 'Quais os limites da cláusula quota litis?', 'Honorários em dinheiro; somados à sucumbência, não podem superar a vantagem do cliente (CED, art. 50).'],
  [2, 'O advogado pode sacar duplicata para cobrar honorários?', 'Não. Pode emitir fatura e aceitar cartão de crédito (CED, arts. 52 e 53).'],
  [2, 'O que o advogado deve fazer antes de cobrar honorários em juízo do próprio cliente?', 'Renunciar antes ao mandato (CED, art. 54).'],
  [3, 'A censura é publicada? Pode ser convertida?', 'Não é publicada e pode virar advertência, em ofício reservado, se houver atenuante.'],
  [3, 'Qual a duração e a abrangência da suspensão?', 'De 30 dias a 12 meses, em todo o território nacional.'],
  [3, 'Quando cabe a exclusão e qual o quórum?', 'Três suspensões, falsa prova de requisito de inscrição, inidoneidade moral ou crime infamante; quórum de 2/3 do Conselho Seccional.'],
  [3, 'A multa pode ser aplicada isoladamente?', 'Não. A multa nunca é aplicada sozinha.'],
  [3, 'Qual o prazo da prescrição disciplinar? E a prescrição intercorrente?', '5 anos da constatação oficial do fato; o processo parado por mais de 3 anos gera prescrição intercorrente (art. 43).'],
  [3, 'Quando o advogado punido pode pedir reabilitação?', '1 ano após cumprir a sanção; se a infração resultou de crime, depende também da reabilitação criminal (art. 41).'],
  [3, 'A anuidade em atraso pode gerar suspensão do advogado?', 'Não. O STF declarou inconstitucional a suspensão por anuidade em atraso.'],
  [4, 'Onde se registra a sociedade de advogados?', 'Só no Conselho Seccional da OAB da sede — nunca na Junta Comercial.'],
  [4, 'Sócios da mesma sociedade podem atuar em lados opostos da mesma causa?', 'Não (art. 15, § 6º).'],
  [4, 'O advogado pode integrar duas sociedades (ou sociedade + unipessoal) na mesma Seccional?', 'Não (art. 15, § 4º).'],
  [4, 'Como o sócio responde pelos danos causados aos clientes?', 'De forma subsidiária e ilimitada (art. 17).'],
  [5, 'O mandato se extingue pelo decurso do tempo?', 'Não, salvo se o instrumento fixar prazo (CED, art. 18).'],
  [5, 'Como funciona a renúncia ao mandato?', 'Omite o motivo; notifica-se o cliente, preferencialmente por carta com AR, e o advogado continua representando por 10 dias, salvo substituição antes.'],
  [5, 'O advogado pode aceitar procuração de quem já tem advogado constituído?', 'Só com prévio conhecimento do colega, salvo motivo plenamente justificável ou medidas urgentes e inadiáveis (CED, art. 14).'],
  [6, 'A advocacia pode ser divulgada em conjunto com outra atividade?', 'Não. A divulgação conjunta é sempre vedada (EAOAB, art. 1º, § 3º; CED, art. 40, IV).'],
  [6, 'O que pode e o que não pode constar no cartão de visita do advogado?', 'Foto do escritório pode; foto pessoal não; cargo ocupado não, salvo o de professor universitário.'],
  [7, 'Qual a consequência dos atos privativos praticados por não inscrito ou por advogado suspenso? O habeas corpus é privativo?', 'São nulos. O habeas corpus não é privativo de advogado.'],
  [7, 'A consultoria jurídica exige mandato ou contrato?', 'Não. Pode ser verbal, sem mandato e sem contrato (art. 5º, § 4º).'],
  [8, 'Doença mental: quando gera licença e quando gera cancelamento da inscrição?', 'Curável gera licença; incurável gera cancelamento.'],
  [8, 'A carteira da OAB vale como identidade?', 'Sim, vale como documento de identidade civil.'],
  [10, 'Quem tem competência para punir o advogado? E para a suspensão preventiva?', 'Pune a Seccional do local da infração. A suspensão preventiva é do TED da inscrição principal, com oitiva prévia, por até 90 dias.'],
  [10, 'Denúncia anônima instaura processo disciplinar? O processo é público?', 'Não instaura. O processo disciplinar é sigiloso.'],
  [11, 'Qual a diferença entre incompatibilidade e impedimento?', 'Incompatibilidade é proibição total e vale mesmo em causa própria; impedimento é proibição parcial.'],
  [12, 'Que atos o estagiário pode praticar sozinho?', 'Retirar e devolver autos (carga), obter certidões e assinar petição de juntada de documentos (RG, art. 29, § 1º).'],
  [13, 'O advogado pode recusar-se a depor sobre fato sigiloso mesmo autorizado pelo cliente?', 'Sim. O sigilo é de ordem pública: pode recusar-se a depor mesmo autorizado ou solicitado pelo cliente.'],
]

// Chapter without "Pegadinhas da FGV" box
const EXTRA_CARDS = {
  19: [
    ['Quem exerce advocacia pública e se sujeita ao Estatuto (art. 3º, § 1º)?', 'Os integrantes da AGU, da Procuradoria da Fazenda Nacional e das Procuradorias e Consultorias Jurídicas dos Estados, DF, Municípios e respectivas entidades da Administração indireta e fundacional.'],
    ['O advogado público precisa de inscrição na OAB? Pode integrar órgãos da Ordem?', 'Sim, a inscrição é obrigatória (STF, Tema 936). É elegível e pode integrar qualquer órgão da OAB (RG, art. 9º).'],
    ['Quem julga disciplinarmente o advogado público pela sua atuação funcional?', 'A corregedoria do próprio órgão, e não o TED da OAB (STF, RE 609.517, Tema 936, 2026).'],
    ['O defensor público precisa de inscrição na OAB?', 'Não. Pelo STF (ADI 4.636), sua capacidade postulatória decorre da nomeação e posse no cargo.'],
    ['Advogados públicos podem receber honorários de sucumbência?', 'Sim, são constitucionais, respeitado o teto remuneratório (STF, ADI 6.053).'],
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID()
const q = (v) => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const SUBJECT_ID = `(SELECT \`id\` FROM \`subjects\` WHERE \`name\` = ${q(SUBJECT)} LIMIT 1)`
const ADMIN_ID = "(SELECT `id` FROM `users` ORDER BY `role` = 'super_admin' DESC, `role` = 'admin' DESC, `created_at` LIMIT 1)"
const clean = (s) => s.replace(/\s+/g, ' ').trim()

function businessDays(start, count) {
  const days = []
  const d = new Date(start + 'T12:00:00Z')
  while (days.length < count) {
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) days.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return days
}

// ~300 characters per minute: careful reading with the dry law open alongside, as the ebook asks
const readingMinutes = (html) => Math.min(90, Math.max(15, Math.round(cheerio.load(html).root().text().length / 300 / 5) * 5))

// ─── Parse the ebook ──────────────────────────────────────────────────────────

async function parseEbook() {
  const { value } = await mammoth.convertToHtml({ path: DOCX })
  const $ = cheerio.load(value)
  $('img').closest('p').remove()

  // Group top-level nodes under each <h1>
  const sections = []
  for (const el of $('body').children().toArray()) {
    if (el.tagName === 'h1') sections.push({ title: clean($(el).text()), nodes: [] })
    else if (sections.length) sections.at(-1).nodes.push(el)
  }
  // "CAPÍTULO N" markers sit at the end of the previous section
  for (const s of sections) {
    s.nodes = s.nodes.filter(n => !/^CAPÍTULO \d+$/.test(clean($(n).text())))
  }

  const find = (title) => sections.find(s => s.title.startsWith(title))
  const intro = ['Como usar este ebook', 'A Ética na prova', 'Raio-X da incidência', 'Mudanças recentes'].map(find)
  const firstChapter = sections.indexOf(find('Direitos e prerrogativas'))
  const lastChapter = sections.indexOf(find('Exercício de cargos'))
  const chapters = sections.slice(firstChapter, lastChapter + 1)

  return {
    $,
    intro,
    chapters: chapters.map((s, i) => parseChapter($, s, i + 1)),
    naoCairam: find('Temas que ainda não caíram'),
    vespera: find('Revisão de véspera'),
  }
}

function parseChapter($, section, number) {
  const qIdx = section.nodes.findIndex(n => n.tagName === 'h2' && clean($(n).text()) === 'Questões comentadas')
  const body = qIdx === -1 ? section.nodes : section.nodes.slice(0, qIdx)
  const questionNodes = qIdx === -1 ? [] : section.nodes.slice(qIdx + 1)

  // Summary paragraph right after the Raio-X box
  const summary = body.find(n => n.tagName === 'p' && clean($(n).text()).length > 60)

  // Pegadinhas da FGV → flashcards
  const cards = []
  for (const n of body) {
    if (n.tagName !== 'table' || !clean($(n).find('p').first().text()).startsWith('PEGADINHAS')) continue
    $(n).find('li').each((_, li) => {
      const text = clean($(li).text())
      const [claim, ...rest] = text.split('→')
      let answer = clean(rest.join('→')).replace(/^errado[:;.]?\s*/i, '')
      answer = text.match(/→\s*errado/i)
        ? 'Errado.' + (answer ? ' ' + answer[0].toUpperCase() + answer.slice(1) : '')
        : answer[0].toUpperCase() + answer.slice(1)
      cards.push([`Certo ou errado? ${clean(claim)}`, answer])
    })
  }

  // Questões comentadas
  const questions = []
  for (const n of questionNodes) {
    const text = clean($(n).text())
    const header = text.match(/^QUESTÃO \d+\s*·\s*(.+)$/)
    if (n.tagName === 'p' && header) {
      questions.push({ source: header[1], statement: [], alternatives: {}, explanation: '' })
      continue
    }
    const cur = questions.at(-1)
    if (!cur) continue
    const alt = text.match(/^\(([A-D])\)\s*(.*)$/)
    if (n.tagName === 'p' && alt) cur.alternatives[alt[1].toLowerCase()] = alt[2]
    else if (n.tagName === 'p') cur.statement.push(text)
    else if (n.tagName === 'table') {
      const paragraphs = $(n).find('p').toArray().map(p => clean($(p).text())).filter(t => t && t !== 'COMENTÁRIO')
      const full = paragraphs.join('\n')
      const gab = full.match(/Gabarito:\s*([A-D])/)
      if (!gab) throw new Error(`Sem gabarito: cap. ${number}, ${cur.source}`)
      cur.correctAnswer = gab[1].toLowerCase()
      cur.explanation = full.replace(/\s*Gabarito:\s*[A-D]\.?\s*$/, '').trim()
    }
  }
  for (const qn of questions) {
    if (Object.keys(qn.alternatives).length !== 4) throw new Error(`Alternativas incompletas: cap. ${number}, ${qn.source}`)
    const exam = qn.source.match(/^(\d+)º Exame.*questão (\d+)/)
    qn.exam = exam ? { examNumber: Number(exam[1]), number: Number(exam[2]) } : null
    qn.statement = `(${qn.source}) ${qn.statement.join('\n\n')}`
  }

  return {
    number,
    title: section.title,
    summary: summary ? clean($(summary).text()) : null,
    bodyHtml: body.map(n => $.html(n)).join('\n'),
    sectionNodes: section.nodes,
    cards,
    questions,
  }
}

// Mammoth flattens the norms diagram of the "Introdução" page; rebuilt by hand.
const INTRO_NORMS_HTML = `
<h2>As normas que caem na prova</h2>
<p>De acordo com o Código de Ética e Disciplina da OAB, “o exercício da advocacia exige conduta compatível com os preceitos do Código, do Estatuto, do Regulamento Geral, dos Provimentos e com os princípios da moral individual, social e profissional.”</p>
<h3>Estatuto da OAB — Lei 8.906/94</h3>
<p>A Lei nº 8.906, de 4 de julho de 1994, é o próprio Estatuto da OAB (Estatuto da Advocacia e da Ordem dos Advogados do Brasil). Ou seja, "Lei 8.906" e "Estatuto da OAB" são <strong>exatamente o mesmo documento legal</strong>: é a norma primária e de maior força. Criada pelo Congresso Nacional, ela define as regras gerais da profissão, os atos privativos de advocacia, os direitos e prerrogativas dos advogados, as infrações disciplinares e a estrutura básica da OAB (Conselho Federal, Seccionais e Subseções).</p>
<h3>Regulamento Geral</h3>
<p>É uma norma editada pelo Conselho Federal da OAB com base no próprio Estatuto (autorizado pelo art. 78 da Lei 8.906). Ele serve para detalhar, explicar e operacionalizar os comandos da lei principal. O Regulamento Geral não pode criar obrigações novas ou contrariar a Lei 8.906, apenas desdobrar a sua aplicação prática no dia a dia da instituição e da profissão.</p>
<h3>Código de Ética e Disciplina</h3>
<p>Também editado pelo Conselho Federal da OAB (com base nos arts. 33 e 54 do Estatuto), foca especificamente nas regras de conduta moral, deontológica e profissional do advogado. Ele regula a relação com o cliente, colegas, juízes e sociedade, além de detalhar as regras de publicidade profissional e o processo nos Tribunais de Ética.</p>
<h3>Provimentos e resoluções</h3>
<p>São atos administrativos complementares de menor grau hierárquico, expedidos pelo Conselho Federal para resolver questões pontuais ou atualizar regras específicas (como diretrizes do Exame de Ordem ou regras digitais).</p>`

const sourceNote = (label) =>
  `<p><em>Fonte: Ebook Ética — Descomplicando OAB (Edição 2026), ${label}. <a href="${FILE_URL}">Baixar o ebook completo</a>.</em></p>`

// ─── Build the migration ──────────────────────────────────────────────────────

async function main() {
  const ebook = await parseEbook()
  const { $ } = ebook
  const stmts = []
  const add = (sql) => stmts.push(sql.trim() + ';')

  const trainingId = uuid()
  const fileId = uuid()
  const dayIds = []
  const allCards = []

  // ── Days (built first, inserted after the training) ──
  const days = []

  days.push({
    title: 'Comece por aqui: a Ética na prova',
    description: 'Como usar o ebook, o peso da Ética na 1ª fase, o raio-X da incidência por assunto, as mudanças recentes e as normas cobradas.',
    activities: [{
      kind: 'apostila',
      title: 'Leitura: Como usar o ebook, raio-X e mudanças recentes',
      html: ebook.intro.map(s => `<h2>${s.title}</h2>\n` + s.nodes.map(n => $.html(n)).join('\n')).join('\n') + INTRO_NORMS_HTML + sourceNote('introdução'),
    }],
  })

  for (const ch of ebook.chapters) {
    const vespera = VESPERA.filter(v => v[0] === ch.number).map(v => [v[1], v[2]])
    const cards = [...ch.cards, ...(EXTRA_CARDS[ch.number] || []), ...vespera]
    days.push({
      chapter: ch,
      title: `Capítulo ${ch.number} — ${ch.title}`,
      description: ch.summary,
      activities: [
        { kind: 'apostila', title: `Leitura: ${ch.title}`, html: ch.bodyHtml + sourceNote(`capítulo ${ch.number}`) },
        { kind: 'ebookQuestions', title: 'Questões comentadas do ebook', questions: ch.questions },
        { kind: 'flashcards', title: 'Flashcards: pegadinhas da FGV e frases-chave', cards },
        // Last, so dropping it when the topic has no exam questions leaves no gap in the order
        { kind: 'examQuestions', title: 'Questões de provas anteriores da OAB', ebookTopicOrder: ch.number, exclude: ch.questions.map(x => x.exam).filter(Boolean) },
      ],
    })
  }

  const allQuestions = ebook.chapters.flatMap(c => c.questions)
  days.push({
    title: 'Revisão de véspera',
    description: 'Temas que ainda não caíram, as 40 frases que valem pontos e uma revisão com todas as questões comentadas do ebook.',
    activities: [
      { kind: 'apostila', title: 'Leitura: Temas que ainda não caíram', html: ebook.naoCairam.nodes.map(n => $.html(n)).join('\n') + sourceNote('temas que ainda não caíram') },
      { kind: 'apostila', title: 'Leitura: Revisão de véspera — 40 frases que valem pontos', html: ebook.vespera.nodes.map(n => $.html(n)).join('\n') + sourceNote('revisão de véspera') },
      { kind: 'flashcards', title: 'Flashcards: as 40 frases da véspera', cards: VESPERA.map(v => [v[1], v[2]]), duplicate: true },
      { kind: 'ebookQuestions', title: `Revisão geral: as ${allQuestions.length} questões comentadas do ebook`, questions: allQuestions, minutes: 80 },
    ],
  })

  const dates = businessDays(START_DATE, days.length)

  // ── Training ──
  add(`
INSERT INTO \`trainings\` (\`id\`, \`name\`, \`description\`, \`hours_per_day\`, \`days_count\`, \`start_date\`, \`end_date\`, \`status\`, \`created_by\`)
VALUES (${q(trainingId)}, ${q(TRAINING_NAME)}, ${q(`Treinamento de Ética (Estatuto, Regulamento Geral e Código de Ética e Disciplina) totalmente baseado no ebook Ética — Descomplicando OAB, Edição 2026. Os ${ebook.chapters.length} capítulos seguem a ordem de incidência na prova; cada dia traz a leitura do capítulo, as questões comentadas do ebook, questões de provas anteriores do mesmo tópico e flashcards.`)}, 2, ${days.length}, ${q(dates[0])}, ${q(dates.at(-1))}, 'draft', ${ADMIN_ID})`)

  // ── Knowledge file (the uploaded ebook) + chunks ──
  const size = fs.statSync(DOCX).size
  add(`
INSERT INTO \`knowledge_files\` (\`id\`, \`name\`, \`original_name\`, \`file_type\`, \`url\`, \`size_bytes\`, \`subject_id\`, \`uploaded_by\`, \`processed_at\`)
VALUES (${q(fileId)}, 'Ebook Ética — Descomplicando OAB', ${q(path.basename(DOCX))}, 'docx', ${q(FILE_URL)}, ${size}, ${SUBJECT_ID}, ${ADMIN_ID}, NOW())`)

  const chunks = []
  const chunkSection = (label, nodes) => {
    let current = { section: label, text: [] }
    const flush = () => { if (current.text.length) chunks.push({ section: current.section, content: `${current.section}\n\n${current.text.join('\n')}` }) }
    for (const n of nodes) {
      if (n.tagName === 'h2') { flush(); current = { section: `${label} — ${clean($(n).text())}`, text: [] } }
      else {
        const t = $(n).find('p, li').toArray().map(e => clean($(e).text())).filter(Boolean)
        current.text.push(...(t.length ? t : [clean($(n).text())]).filter(Boolean))
      }
    }
    flush()
  }
  for (const s of ebook.intro) chunkSection(s.title, s.nodes)
  for (const ch of ebook.chapters) chunkSection(`Capítulo ${ch.number} — ${ch.title}`, ch.sectionNodes)
  chunkSection(ebook.naoCairam.title, ebook.naoCairam.nodes)
  chunkSection(ebook.vespera.title, ebook.vespera.nodes)

  for (let i = 0; i < chunks.length; i += 20) {
    add(`
INSERT INTO \`knowledge_chunks\` (\`id\`, \`file_id\`, \`content\`, \`chunk_index\`, \`subject_id\`, \`metadata\`) VALUES
${chunks.slice(i, i + 20).map((c, j) => `(${q(uuid())}, ${q(fileId)}, ${q(c.content)}, ${i + j}, ${SUBJECT_ID}, ${q(JSON.stringify({ section: c.section }))})`).join(',\n')}`)
  }

  // ── Days, topics and content ──
  const examSetIds = []
  days.forEach((day, d) => {
    const dayId = uuid()
    dayIds.push(dayId)
    add(`
INSERT INTO \`training_days\` (\`id\`, \`training_id\`, \`day_number\`, \`date\`, \`title\`, \`description\`)
VALUES (${q(dayId)}, ${q(trainingId)}, ${d + 1}, ${q(dates[d])}, ${q(day.title)}, ${q(day.description)})`)

    let dayApostilaId = null
    day.activities.forEach((act, order) => {
      const topicId = uuid()
      let type, minutes, content = null

      if (act.kind === 'apostila') {
        type = 'apostila'
        minutes = readingMinutes(act.html)
      } else if (act.kind === 'ebookQuestions' || act.kind === 'examQuestions') {
        type = 'exercise'
        const setId = uuid()
        content = { exerciseSetId: setId }
        if (act.kind === 'ebookQuestions') {
          minutes = act.minutes || 20
          add(`
INSERT INTO \`exercise_sets\` (\`id\`, \`title\`, \`apostila_id\`, \`subject_id\`, \`question_count\`)
VALUES (${q(setId)}, ${q(day.chapter ? `Ética — Cap. ${day.chapter.number}: ${day.chapter.title} (questões comentadas do ebook)` : `Ética — ${act.title}`)}, ${q(dayApostilaId)}, ${SUBJECT_ID}, ${act.questions.length})`)
          add(`
INSERT INTO \`exercise_questions\` (\`id\`, \`set_id\`, \`order\`, \`statement\`, \`alternatives\`, \`correct_answer\`, \`explanation\`) VALUES
${act.questions.map((x, i) => `(${q(uuid())}, ${q(setId)}, ${i + 1}, ${q(x.statement)}, ${q(JSON.stringify(x.alternatives))}, ${q(x.correctAnswer)}, ${q(x.explanation)})`).join(',\n')}`)
        } else {
          minutes = 30
          examSetIds.push({ setId, topicId })
          const exclude = act.exclude.map(e => `(${e.examNumber}, ${e.number})`).join(', ')
          add(`
INSERT INTO \`exercise_sets\` (\`id\`, \`title\`, \`apostila_id\`, \`subject_id\`, \`question_count\`)
VALUES (${q(setId)}, ${q(`Ética — Cap. ${day.chapter.number}: ${day.chapter.title} (provas anteriores)`)}, ${q(dayApostilaId)}, ${SUBJECT_ID}, 0)`)
          add(`
INSERT INTO \`exercise_questions\` (\`id\`, \`set_id\`, \`order\`, \`statement\`, \`alternatives\`, \`correct_answer\`, \`explanation\`)
SELECT UUID(), ${q(setId)}, ROW_NUMBER() OVER (ORDER BY e.\`exam_number\` DESC, eq.\`number\`),
  CONCAT('(', e.\`exam_number\`, 'º Exame de Ordem, questão ', eq.\`number\`, ') ', eq.\`statement\`),
  eq.\`alternatives\`, LOWER(eq.\`correct_answer\`), NULL
FROM \`exam_questions\` eq
JOIN \`exams\` e ON e.\`id\` = eq.\`exam_id\`
JOIN \`ebook_topics\` et ON et.\`id\` = eq.\`ebook_topic_id\`
WHERE et.\`subject_id\` = ${SUBJECT_ID} AND et.\`order\` = ${act.ebookTopicOrder}
  AND LOWER(eq.\`correct_answer\`) IN ('a', 'b', 'c', 'd')${exclude ? `\n  AND (e.\`exam_number\`, eq.\`number\`) NOT IN (${exclude})` : ''}`)
        }
      } else if (act.kind === 'flashcards') {
        type = 'flashcard'
        minutes = Math.min(30, Math.max(10, Math.round(act.cards.length * 1.5 / 5) * 5))
        const setId = uuid()
        content = { flashcardSetId: setId }
        add(`
INSERT INTO \`flashcard_sets\` (\`id\`, \`title\`, \`apostila_id\`, \`subject_id\`, \`card_count\`)
VALUES (${q(setId)}, ${q(day.chapter ? `Ética — Cap. ${day.chapter.number}: ${day.chapter.title}` : `Ética — ${act.title.replace(/^Flashcards: /, '')}`)}, ${q(dayApostilaId)}, ${SUBJECT_ID}, ${act.cards.length})`)
        add(`
INSERT INTO \`flashcard_set_cards\` (\`id\`, \`set_id\`, \`order\`, \`front\`, \`back\`, \`difficulty\`) VALUES
${act.cards.map((c, i) => `(${q(uuid())}, ${q(setId)}, ${i + 1}, ${q(c[0])}, ${q(c[1])}, 'medium')`).join(',\n')}`)
        if (!act.duplicate) allCards.push(...act.cards)
      }

      add(`
INSERT INTO \`training_topics\` (\`id\`, \`training_day_id\`, \`order\`, \`title\`, \`type\`, \`subject_id\`, \`content\`, \`estimated_minutes\`)
VALUES (${q(topicId)}, ${q(dayId)}, ${order + 1}, ${q(act.title)}, '${type}', ${SUBJECT_ID}, ${q(content && JSON.stringify(content))}, ${minutes})`)

      if (act.kind === 'apostila') {
        const apostilaId = uuid()
        dayApostilaId = dayApostilaId || apostilaId
        add(`
INSERT INTO \`apostilas\` (\`id\`, \`training_topic_id\`, \`subject_id\`, \`title\`, \`content_html\`, \`pdf_url\`, \`generated_by\`)
VALUES (${q(apostilaId)}, ${q(topicId)}, ${SUBJECT_ID}, ${q(day.chapter ? `Ética — Cap. ${day.chapter.number}: ${day.chapter.title}` : `Ética — ${act.title.replace(/^Leitura: /, '')}`)}, ${q(act.html)}, ${q(FILE_URL)}, 'ebook')`)
      }
    })
  })

  // Exam-question sets: real count, drop the empty ones, size the activity
  const setList = examSetIds.map(s => q(s.setId)).join(', ')
  add(`
UPDATE \`exercise_sets\` s
SET s.\`question_count\` = (SELECT COUNT(*) FROM \`exercise_questions\` x WHERE x.\`set_id\` = s.\`id\`)
WHERE s.\`id\` IN (${setList})`)
  add(`
UPDATE \`training_topics\` t
JOIN \`exercise_sets\` s ON s.\`id\` = JSON_UNQUOTE(JSON_EXTRACT(t.\`content\`, '$.exerciseSetId'))
SET t.\`title\` = CONCAT('Questões de provas anteriores da OAB (', s.\`question_count\`, ')'),
    t.\`estimated_minutes\` = LEAST(90, GREATEST(15, s.\`question_count\` * 3))
WHERE s.\`id\` IN (${setList}) AND s.\`question_count\` > 0`)
  add(`DELETE FROM \`training_topics\` WHERE \`id\` IN (${examSetIds.map(s => q(s.topicId)).join(', ')}) AND JSON_UNQUOTE(JSON_EXTRACT(\`content\`, '$.exerciseSetId')) IN (SELECT \`id\` FROM \`exercise_sets\` WHERE \`question_count\` = 0)`)
  add(`DELETE FROM \`exercise_sets\` WHERE \`id\` IN (${setList}) AND \`question_count\` = 0`)

  // Flat flashcards (student "Flashcards" page reads this table)
  for (let i = 0; i < allCards.length; i += 50) {
    add(`
INSERT INTO \`flashcards\` (\`id\`, \`front\`, \`back\`, \`subject_id\`, \`training_id\`, \`difficulty\`) VALUES
${allCards.slice(i, i + 50).map(c => `(${q(uuid())}, ${q(c[0])}, ${q(c[1])}, ${SUBJECT_ID}, ${q(trainingId)}, 'medium')`).join(',\n')}`)
  }

  // Day hours from the activities, training hours/day as the average
  add(`
UPDATE \`training_days\` d
SET d.\`estimated_hours\` = ROUND((SELECT SUM(t.\`estimated_minutes\`) FROM \`training_topics\` t WHERE t.\`training_day_id\` = d.\`id\`) / 60, 1)
WHERE d.\`training_id\` = ${q(trainingId)}`)
  add(`
UPDATE \`trainings\`
SET \`hours_per_day\` = GREATEST(1, (SELECT ROUND(AVG(d.\`estimated_hours\`), 1) FROM \`training_days\` d WHERE d.\`training_id\` = ${q(trainingId)}))
WHERE \`id\` = ${q(trainingId)}`)

  const header = '-- Treinamento de Ética gerado do ebook Descomplicando OAB por scripts/build-etica-training.js\n'
  fs.writeFileSync(MIGRATION, header + stmts.join('--> statement-breakpoint\n') + '\n')

  fs.mkdirSync(path.join(ROOT, 'content/ebooks'), { recursive: true })
  fs.copyFileSync(DOCX, path.join(ROOT, 'content/ebooks', path.basename(PUBLIC_FILE)))

  console.log(`${days.length} dias, ${ebook.chapters.length} capítulos, ${allQuestions.length} questões do ebook, ${allCards.length} flashcards, ${chunks.length} chunks`)
  for (const ch of ebook.chapters) console.log(`  cap. ${ch.number}: ${ch.questions.length} questões, ${ch.cards.length} pegadinhas — ${ch.title}`)
  console.log(`→ ${path.relative(ROOT, MIGRATION)} (${(fs.statSync(MIGRATION).size / 1024).toFixed(0)} KB)`)
}

main().catch(err => { console.error(err); process.exit(1) })
