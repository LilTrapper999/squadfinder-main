import type { Namespace } from '.'

// Each row: [English source, es, fr, de, pt, ru, zh, ja, ko, ar, hi].
// Keys are the exact English strings used in t(); {placeholders} are never translated.
type Row = [string, string, string, string, string, string, string, string, string, string, string]

const LANG_ORDER = ['es', 'fr', 'de', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'] as const

const ROWS: Row[] = [
  // ── Page chrome ────────────────────────────────────────────────────────────
  ['← Back', '← Atrás', '← Retour', '← Zurück', '← Voltar', '← Назад', '← 返回', '← 戻る', '← 뒤로', '← رجوع', '← वापस'],
  ['Select Game', 'Elegir juego', 'Choisir un jeu', 'Spiel wählen', 'Escolher jogo', 'Выбор игры', '选择游戏', 'ゲームを選択', '게임 선택', 'اختيار اللعبة', 'गेम चुनें'],
  ['Build Profile', 'Crear perfil', 'Créer le profil', 'Profil erstellen', 'Criar perfil', 'Создание профиля', '创建资料', 'プロフィール作成', '프로필 만들기', 'إنشاء الملف الشخصي', 'प्रोफ़ाइल बनाएँ'],
  ['HELP US FIND YOUR SQUAD', 'AYÚDANOS A ENCONTRAR TU ESCUADRÓN', 'AIDE-NOUS À TROUVER TON ESCOUADE', 'HILF UNS, DEIN SQUAD ZU FINDEN', 'AJUDE-NOS A ENCONTRAR O SEU ESQUADRÃO', 'ПОМОГИ НАМ НАЙТИ ТВОЙ ОТРЯД', '帮我们找到你的小队', 'あなたのスクワッド探しをお手伝いください', '나에게 맞는 스쿼드를 찾을 수 있게 도와주세요', 'ساعدنا في العثور على فريقك', 'अपना स्क्वाड ढूँढने में हमारी मदद करें'],
  ['Welcome, Commander', 'Bienvenido, Comandante', 'Bienvenue, Commandant', 'Willkommen, Commander', 'Bem-vindo, Comandante', 'Добро пожаловать, командир', '欢迎，指挥官', 'ようこそ、コマンダー', '환영합니다, 사령관님', 'مرحبًا أيها القائد', 'स्वागत है, कमांडर'],
  ['Answer honestly — this is how we find your perfect squad.', 'Responde con sinceridad: así encontramos a tu escuadrón ideal.', 'Réponds honnêtement : c\'est ainsi que nous trouvons ton escouade idéale.', 'Antworte ehrlich – so finden wir dein perfektes Squad.', 'Responda com sinceridade — é assim que encontramos o esquadrão perfeito para você.', 'Отвечай честно — так мы найдём идеальный отряд для тебя.', '请如实回答——这样我们才能为你找到最合适的小队。', '正直に答えてください。それがあなたにぴったりのスクワッドを見つける鍵です。', '솔직하게 답해 주세요. 그래야 딱 맞는 스쿼드를 찾을 수 있어요.', 'أجب بصدق — هكذا نجد لك الفريق المثالي.', 'ईमानदारी से जवाब दें — इसी से हम आपके लिए सही स्क्वाड ढूँढते हैं।'],

  // ── Shared UI ──────────────────────────────────────────────────────────────
  ['Yes', 'Sí', 'Oui', 'Ja', 'Sim', 'Да', '是', 'はい', '예', 'نعم', 'हाँ'],
  ['No', 'No', 'Non', 'Nein', 'Não', 'Нет', '否', 'いいえ', '아니요', 'لا', 'नहीं'],
  ['Other', 'Otro', 'Autre', 'Andere', 'Outro', 'Другое', '其他', 'その他', '기타', 'أخرى', 'अन्य'],
  ['Type your language exactly as others would type it', 'Escribe tu idioma tal como lo escribirían los demás', 'Saisis ta langue comme les autres l\'écriraient', 'Gib deine Sprache so ein, wie andere sie schreiben würden', 'Digite seu idioma exatamente como os outros digitariam', 'Введи свой язык так, как его написали бы другие', '请按照其他人通常的写法输入你的语言', '他の人が入力するとおりに言語名を入力してください', '다른 사람들이 입력할 방식 그대로 언어를 입력하세요', 'اكتب لغتك كما سيكتبها الآخرون تمامًا', 'अपनी भाषा वैसे ही लिखें जैसे दूसरे लिखते हैं'],
  ['Will be capitalised automatically (e.g. "klingon" → "Klingon")', 'Se pondrá en mayúscula automáticamente (p. ej., "klingon" → "Klingon")', 'La majuscule sera ajoutée automatiquement (p. ex. « klingon » → « Klingon »)', 'Wird automatisch großgeschrieben (z. B. „klingon“ → „Klingon“)', 'Será colocado em maiúscula automaticamente (ex.: "klingon" → "Klingon")', 'Первая буква станет заглавной автоматически (напр. «klingon» → «Klingon»)', '将自动首字母大写（例如 "klingon" → "Klingon"）', '自動的に先頭が大文字になります（例: 「klingon」→「Klingon」）', '첫 글자가 자동으로 대문자로 바뀝니다 (예: "klingon" → "Klingon")', 'سيتم تحويل أول حرف إلى كبير تلقائيًا (مثال: "klingon" ← "Klingon")', 'पहला अक्षर अपने-आप बड़ा हो जाएगा (जैसे "klingon" → "Klingon")'],
  ['Select an option', 'Selecciona una opción', 'Sélectionne une option', 'Option auswählen', 'Selecione uma opção', 'Выбери вариант', '请选择一项', 'オプションを選択', '옵션을 선택하세요', 'اختر خيارًا', 'एक विकल्प चुनें'],
  ['Required', 'Obligatorio', 'Obligatoire', 'Pflichtfeld', 'Obrigatório', 'Обязательно', '必填', '必須', '필수', 'مطلوب', 'आवश्यक'],
  ['Optional', 'Opcional', 'Facultatif', 'Optional', 'Opcional', 'Необязательно', '选填', '任意', '선택', 'اختياري', 'वैकल्पिक'],

  // ── Comms style slider ─────────────────────────────────────────────────────
  ['No Communication', 'Sin comunicación', 'Aucune communication', 'Keine Kommunikation', 'Sem comunicação', 'Без общения', '不交流', 'コミュニケーションなし', '소통 안 함', 'بدون تواصل', 'कोई संवाद नहीं'],
  ['Only Text Chat', 'Solo chat de texto', 'Chat texte uniquement', 'Nur Textchat', 'Apenas chat de texto', 'Только текстовый чат', '仅文字聊天', 'テキストチャットのみ', '텍스트 채팅만', 'الدردشة النصية فقط', 'केवल टेक्स्ट चैट'],
  ['Only Voice Chat', 'Solo chat de voz', 'Chat vocal uniquement', 'Nur Sprachchat', 'Apenas chat de voz', 'Только голосовой чат', '仅语音聊天', 'ボイスチャットのみ', '음성 채팅만', 'الدردشة الصوتية فقط', 'केवल वॉइस चैट'],
  ['Both', 'Ambos', 'Les deux', 'Beides', 'Ambos', 'Оба', '两者都用', '両方', '둘 다', 'كلاهما', 'दोनों'],

  // ── Role matching ──────────────────────────────────────────────────────────
  ['Role matching style', 'Estilo de emparejamiento de roles', 'Style d\'association des rôles', 'Rollen-Matching-Stil', 'Estilo de combinação de funções', 'Подбор по ролям', '职责匹配方式', 'ロールのマッチング方式', '역할 매칭 방식', 'أسلوب مطابقة الأدوار', 'रोल मैचिंग शैली'],
  ['Complement me', 'Que me complementen', 'Qu\'ils me complètent', 'Ergänzt mich', 'Que me complementem', 'Дополняют меня', '互补型', '自分を補う人', '나를 보완해 줘', 'يكمّلونني', 'मेरी कमी पूरी करें'],
  ['Either works', 'Cualquiera sirve', 'Peu importe', 'Beides okay', 'Tanto faz', 'Без разницы', '都可以', 'どちらでもOK', '상관없어요', 'كلاهما مناسب', 'कोई भी चलेगा'],
  ['Match me', 'Que se parezcan a mí', 'Qu\'ils me ressemblent', 'Wie ich', 'Que sejam como eu', 'Такие же, как я', '同类型', '自分と同じタイプ', '나와 비슷하게', 'يشبهونني', 'मेरे जैसे हों'],
  ['Favour squadmates who fill different roles', 'Prioriza compañeros con roles distintos', 'Privilégier les coéquipiers aux rôles différents', 'Bevorzugt Mitspieler mit anderen Rollen', 'Prefira companheiros com funções diferentes', 'Предпочитать напарников с другими ролями', '优先匹配担任不同职责的队友', '違う役割の仲間を優先', '다른 역할을 맡는 팀원을 우선', 'تفضيل زملاء بأدوار مختلفة', 'अलग भूमिका निभाने वाले साथियों को प्राथमिकता दें'],
  ['No preference either way', 'Sin preferencia', 'Aucune préférence', 'Keine Präferenz', 'Sem preferência', 'Без предпочтений', '没有偏好', 'どちらでもよい', '선호 없음', 'لا تفضيل في أي اتجاه', 'कोई प्राथमिकता नहीं'],
  ['Favour squadmates who play like me', 'Prioriza compañeros que juegan como yo', 'Privilégier les coéquipiers qui jouent comme moi', 'Bevorzugt Mitspieler mit ähnlichem Spielstil', 'Prefira companheiros que joguem como eu', 'Предпочитать напарников с похожим стилем игры', '优先匹配与我风格相似的队友', '自分と似たプレイスタイルの仲間を優先', '나와 비슷하게 플레이하는 팀원을 우선', 'تفضيل زملاء يلعبون مثلي', 'मेरी तरह खेलने वाले साथियों को प्राथमिकता दें'],

  // ── Form labels ────────────────────────────────────────────────────────────
  ['Gamesmanship', 'Estilo de juego', 'Style de jeu', 'Spielstil', 'Estilo de jogo', 'Стиль игры', '游戏风格', 'ゲームスタイル', '플레이 스타일', 'أسلوب اللعب', 'गेमिंग शैली'],
  ['Specific for all games', 'Específico para cada juego', 'Spécifique à chaque jeu', 'Spezifisch für jedes Spiel', 'Específico para cada jogo', 'Зависит от игры', '因游戏而异', 'ゲームごとに設定', '게임별 설정', 'خاص بكل لعبة', 'हर गेम के लिए अलग'],
  ['Skill level', 'Nivel de habilidad', 'Niveau de compétence', 'Skill-Level', 'Nível de habilidade', 'Уровень мастерства', '技术水平', 'スキルレベル', '실력 수준', 'مستوى المهارة', 'स्किल लेवल'],
  ['In-game username for {game}', 'Nombre de usuario en {game}', 'Pseudo en jeu pour {game}', 'Ingame-Name für {game}', 'Nome de usuário no jogo para {game}', 'Игровой ник в {game}', '{game} 游戏内用户名', '{game}のゲーム内ユーザー名', '{game} 인게임 닉네임', 'اسم المستخدم داخل {game}', '{game} में आपका यूज़रनेम'],
  ['In-game username', 'Nombre de usuario en el juego', 'Pseudo en jeu', 'Ingame-Name', 'Nome de usuário no jogo', 'Игровой ник', '游戏内用户名', 'ゲーム内ユーザー名', '인게임 닉네임', 'اسم المستخدم داخل اللعبة', 'गेम में यूज़रनेम'],
  ['e.g. ShadowRook', 'p. ej. ShadowRook', 'p. ex. ShadowRook', 'z. B. ShadowRook', 'ex.: ShadowRook', 'напр. ShadowRook', '例如 ShadowRook', '例: ShadowRook', '예: ShadowRook', 'مثال: ShadowRook', 'जैसे ShadowRook'],
  ["This is specific to this game — build a profile for another game and you'll set a different username.", 'Esto es específico de este juego: si creas un perfil para otro juego, podrás poner otro nombre de usuario.', 'Ceci est propre à ce jeu : si tu crées un profil pour un autre jeu, tu pourras choisir un autre pseudo.', 'Das gilt nur für dieses Spiel – für ein anderes Spiel legst du einen eigenen Namen fest.', 'Isto é específico deste jogo — ao criar um perfil para outro jogo, você definirá outro nome de usuário.', 'Это относится только к этой игре — для другой игры ты зададишь другой ник.', '此项仅适用于当前游戏——为其他游戏创建资料时可设置不同的用户名。', 'これはこのゲーム専用です。別のゲームのプロフィールでは別のユーザー名を設定できます。', '이 게임에만 적용됩니다. 다른 게임의 프로필을 만들 때는 다른 닉네임을 설정할 수 있어요.', 'هذا خاص بهذه اللعبة — عند إنشاء ملف للعبة أخرى ستحدد اسم مستخدم مختلفًا.', 'यह सिर्फ़ इसी गेम के लिए है — दूसरे गेम की प्रोफ़ाइल में आप अलग यूज़रनेम रख सकते हैं।'],
  ["What's your role?", '¿Cuál es tu rol?', 'Quel est ton rôle ?', 'Was ist deine Rolle?', 'Qual é a sua função?', 'Какая у тебя роль?', '你的职责是什么？', 'あなたのロールは？', '어떤 역할을 맡나요?', 'ما هو دورك؟', 'आपकी भूमिका क्या है?'],
  ['Which maps do you know well?', '¿Qué mapas conoces bien?', 'Quelles cartes connais-tu bien ?', 'Welche Maps kennst du gut?', 'Quais mapas você conhece bem?', 'Какие карты ты хорошо знаешь?', '你熟悉哪些地图？', 'どのマップに詳しい？', '어떤 맵을 잘 아나요?', 'ما الخرائط التي تعرفها جيدًا؟', 'आप कौन-से मैप अच्छी तरह जानते हैं?'],
  ['Which weapons do you run?', '¿Qué armas usas?', 'Quelles armes utilises-tu ?', 'Welche Waffen spielst du?', 'Quais armas você usa?', 'Какое оружие ты используешь?', '你常用哪些武器？', 'どの武器を使う？', '어떤 무기를 쓰나요?', 'ما الأسلحة التي تستخدمها؟', 'आप कौन-से हथियार इस्तेमाल करते हैं?'],
  ['Vibe Check', 'Vibra y personalidad', 'Vibe Check', 'Vibe-Check', 'Vibe Check', 'Проверка вайба', '性格气质', 'バイブチェック', '바이브 체크', 'فحص الأجواء', 'वाइब चेक'],
  ['Applies to every game', 'Se aplica a todos los juegos', 'S\'applique à tous les jeux', 'Gilt für alle Spiele', 'Vale para todos os jogos', 'Для всех игр', '适用于所有游戏', 'すべてのゲーム共通', '모든 게임에 적용', 'ينطبق على جميع الألعاب', 'सभी गेम पर लागू'],
  ['Rage level', 'Nivel de rabia', 'Niveau de rage', 'Rage-Level', 'Nível de raiva', 'Уровень ярости', '暴躁程度', 'ブチギレ度', '분노 수준', 'مستوى الغضب', 'गुस्से का स्तर'],
  ['Personality vibe', 'Personalidad', 'Personnalité', 'Persönlichkeit', 'Personalidade', 'Характер', '性格类型', 'パーソナリティ', '성격 스타일', 'الشخصية', 'व्यक्तित्व'],
  ['(pick all that apply)', '(elige todas las que apliquen)', '(choisis tout ce qui s\'applique)', '(Mehrfachauswahl möglich)', '(escolha todas que se aplicam)', '(выбери всё подходящее)', '（可多选）', '（当てはまるものをすべて選択）', '(해당하는 것 모두 선택)', '(اختر كل ما ينطبق)', '(जो लागू हों सब चुनें)'],
  ['Comms', 'Comunicación', 'Communication', 'Kommunikation', 'Comunicação', 'Общение', '沟通', 'コミュニケーション', '소통', 'التواصل', 'संवाद'],
  ['Languages determine your match score. Chat and mic preferences are shown to potential squadmates.', 'Los idiomas determinan tu puntuación de compatibilidad. Las preferencias de chat y micrófono se muestran a posibles compañeros.', 'Les langues déterminent ton score de compatibilité. Tes préférences de chat et de micro sont visibles par tes futurs coéquipiers.', 'Sprachen bestimmen deinen Match-Score. Chat- und Mikro-Einstellungen sehen potenzielle Mitspieler.', 'Os idiomas determinam sua pontuação de compatibilidade. As preferências de chat e microfone são exibidas para possíveis companheiros.', 'Языки определяют твой рейтинг совместимости. Настройки чата и микрофона видны потенциальным напарникам.', '语言决定你的匹配分数。聊天和麦克风偏好会展示给潜在队友。', '言語はマッチスコアに影響します。チャットとマイクの設定は、候補の仲間に表示されます。', '언어가 매칭 점수를 결정합니다. 채팅 및 마이크 설정은 잠재적인 팀원에게 표시됩니다.', 'تحدد اللغات درجة التوافق لديك. تُعرض تفضيلات الدردشة والميكروفون على زملاء الفريق المحتملين.', 'भाषाएँ आपका मैच स्कोर तय करती हैं। चैट और माइक की पसंद संभावित साथियों को दिखाई जाती है।'],
  ['In-game Comms Style', 'Estilo de comunicación en el juego', 'Style de communication en jeu', 'Kommunikationsstil im Spiel', 'Estilo de comunicação no jogo', 'Стиль общения в игре', '游戏内沟通方式', 'ゲーム内のコミュニケーション', '인게임 소통 방식', 'أسلوب التواصل داخل اللعبة', 'गेम में संवाद शैली'],
  ['Languages you play in', 'Idiomas en los que juegas', 'Langues dans lesquelles tu joues', 'Sprachen, in denen du spielst', 'Idiomas em que você joga', 'Языки, на которых ты играешь', '你游戏时使用的语言', 'プレイ時に使う言語', '플레이할 때 사용하는 언어', 'اللغات التي تلعب بها', 'आप किन भाषाओं में खेलते हैं'],
  ['Still required', 'Aún falta', 'Encore requis', 'Noch erforderlich', 'Ainda obrigatório', 'Ещё нужно заполнить', '仍需填写', '未入力の必須項目', '아직 필요한 항목', 'لا يزال مطلوبًا', 'अभी भी आवश्यक'],
  ['FIND MY SQUAD →', 'ENCONTRAR MI ESCUADRÓN →', 'TROUVER MON ESCOUADE →', 'MEIN SQUAD FINDEN →', 'ENCONTRAR MEU ESQUADRÃO →', 'НАЙТИ МОЙ ОТРЯД →', '寻找我的小队 →', 'スクワッドを探す →', '내 스쿼드 찾기 →', 'ابحث عن فريقي ←', 'मेरा स्क्वाड ढूँढें →'],
  ['Your role', 'Tu rol', 'Ton rôle', 'Deine Rolle', 'Sua função', 'Твоя роль', '你的职责', 'あなたのロール', '내 역할', 'دورك', 'आपकी भूमिका'],
  ['Maps you know well', 'Mapas que conoces bien', 'Cartes que tu connais bien', 'Maps, die du gut kennst', 'Mapas que você conhece bem', 'Карты, которые ты хорошо знаешь', '你熟悉的地图', '詳しいマップ', '잘 아는 맵', 'الخرائط التي تعرفها جيدًا', 'जो मैप आप अच्छी तरह जानते हैं'],
  ['Weapons you run', 'Armas que usas', 'Armes que tu utilises', 'Waffen, die du spielst', 'Armas que você usa', 'Оружие, которое ты используешь', '你常用的武器', '使用する武器', '사용하는 무기', 'الأسلحة التي تستخدمها', 'जो हथियार आप इस्तेमाल करते हैं'],

  // ── Slider anchors ─────────────────────────────────────────────────────────
  ['Noob', 'Novato', 'Débutant', 'Noob', 'Novato', 'Нуб', '菜鸟', '初心者', '뉴비', 'مبتدئ', 'नौसिखिया'],
  ['Mid (Respectfully)', 'Mediocre (con respeto)', 'Moyen (avec respect)', 'Mittelmaß (mit Respekt)', 'Mediano (com respeito)', 'Середнячок (без обид)', '中等（无意冒犯）', '中堅（悪気はない）', '평범 (악의는 없어요)', 'متوسط (مع كل الاحترام)', 'औसत (सम्मान सहित)'],
  ["We Don't Deserve You", 'No te merecemos', 'On ne te mérite pas', 'Wir verdienen dich nicht', 'Não merecemos você', 'Мы тебя не заслуживаем', '我们配不上你', 'あなたは神すぎる', '우리가 감당 못 할 실력', 'لا نستحقك', 'हम आपके लायक़ नहीं'],
  ['Zen Monk', 'Monje zen', 'Moine zen', 'Zen-Mönch', 'Monge zen', 'Дзен-монах', '禅修僧', '悟りの僧侶', '선승', 'راهب زِن', 'ज़ेन भिक्षु'],
  ['Full Blame Rotation', 'Rotación total de culpas', 'Rotation de blâme complète', 'Dauerhaft alle beschuldigen', 'Rodízio total de culpa', 'Виноваты все по кругу', '轮流甩锅', '全員に責任転嫁', '풀 탓 로테이션', 'توزيع اللوم على الجميع', 'सबको बारी-बारी दोष'],
  ['Keyboard Through Wall', 'Teclado contra la pared', 'Clavier dans le mur', 'Tastatur durch die Wand', 'Teclado na parede', 'Клавиатура в стену', '键盘砸墙', 'キーボードを壁に投げる', '키보드 벽에 던지기', 'لوحة المفاتيح في الجدار', 'कीबोर्ड दीवार में'],

  // ── Personality options ────────────────────────────────────────────────────
  ['Calls out every enemy', 'Marca a todos los enemigos', 'Annonce chaque ennemi', 'Meldet jeden Gegner', 'Avisa todos os inimigos', 'Называет каждого врага', '报点每一个敌人', '敵を全部コールする', '모든 적을 콜해요', 'يُبلغ عن كل عدو', 'हर दुश्मन की कॉल देता है'],
  ['Teaches newer players', 'Enseña a los nuevos', 'Forme les nouveaux joueurs', 'Bringt Neulingen etwas bei', 'Ensina jogadores novos', 'Учит новичков', '指导新手', '初心者に教える', '초보를 가르쳐요', 'يعلّم اللاعبين الجدد', 'नए खिलाड़ियों को सिखाता है'],
  ['Hypes the team', 'Motiva al equipo', 'Motive l\'équipe', 'Pusht das Team', 'Anima o time', 'Заряжает команду', '带动团队气氛', 'チームを盛り上げる', '팀 분위기 메이커', 'يحمّس الفريق', 'टीम में जोश भरता है'],
  ['Quiet but deadly', 'Callado pero letal', 'Discret mais mortel', 'Still, aber tödlich', 'Quieto, mas mortal', 'Тихий, но смертоносный', '沉默但致命', '無口だけど強い', '조용하지만 치명적', 'هادئ لكنه قاتل', 'शांत पर घातक'],
  ['Comedian / Banter', 'Cómico / Bromista', 'Comique / Chambreur', 'Comedian / Sprücheklopfer', 'Comediante / Brincalhão', 'Шутник / Балагур', '搞笑担当 / 爱调侃', 'お笑い担当 / 雑談', '개그맨 / 입담꾼', 'كوميديان / مازح', 'कॉमेडियन / मज़ाकिया'],
  ['Strategist / Over-thinker', 'Estratega / Pensador excesivo', 'Stratège / Trop réfléchi', 'Stratege / Grübler', 'Estrategista / Pensa demais', 'Стратег / Любитель всё обдумать', '战术家 / 想太多', '戦略家 / 考えすぎ', '전략가 / 과몰입 생각러', 'مخطط / كثير التفكير', 'रणनीतिकार / ज़्यादा सोचने वाला'],
  ['Results-only focused', 'Solo importan los resultados', 'Uniquement focalisé sur les résultats', 'Nur Ergebnisse zählen', 'Focado só em resultados', 'Важен только результат', '只看结果', '結果だけ重視', '결과만 중요해요', 'يركّز على النتائج فقط', 'सिर्फ़ नतीजों पर ध्यान'],
  ['Clutch merchant', 'Rey del clutch', 'Spécialiste du clutch', 'Clutch-Händler', 'Rei do clutch', 'Мастер клатчей', '关键时刻救场王', 'クラッチ職人', '클러치 장인', 'تاجر الكلتش', 'क्लच का सौदागर'],
  ['Meme lord', 'Señor de los memes', 'Roi des mèmes', 'Meme-Lord', 'Lorde dos memes', 'Мемный лорд', '梗王', 'ミーム大魔王', '밈 마스터', 'سيد الميمز', 'मीम लॉर्ड'],
  ['Main character energy', 'Energía de protagonista', 'Énergie de personnage principal', 'Hauptfiguren-Energie', 'Energia de protagonista', 'Энергия главного героя', '主角光环', '主人公オーラ', '주인공 에너지', 'طاقة بطل القصة', 'मुख्य किरदार वाली एनर्जी'],

  // ── Generic roles (from lib/mockData.ts) ───────────────────────────────────
  ['Assaulter', 'Asaltante', 'Assaillant', 'Angreifer', 'Assaltante', 'Штурмовик', '突击手', 'アサルト', '돌격수', 'مهاجم', 'असॉल्टर'],
  ['Front line aggressor', 'Agresor de primera línea', 'Agresseur en première ligne', 'Aggressor an der Front', 'Agressor da linha de frente', 'Агрессор на передовой', '前线进攻者', '最前線の攻撃役', '최전선 공격수', 'مهاجم في الخط الأمامي', 'अग्रिम पंक्ति का आक्रामक'],
  ['Sniper / Marksman', 'Francotirador / Tirador', 'Sniper / Tireur d\'élite', 'Scharfschütze / Marksman', 'Sniper / Atirador', 'Снайпер / Стрелок', '狙击手 / 神射手', 'スナイパー / マークスマン', '저격수 / 명사수', 'قناص / رامٍ ماهر', 'स्नाइपर / मार्क्समैन'],
  ['Long-range precision', 'Precisión a larga distancia', 'Précision à longue distance', 'Präzision auf große Distanz', 'Precisão de longo alcance', 'Точность на дальней дистанции', '远程精准打击', '長距離の精密射撃', '원거리 정밀 사격', 'دقة بعيدة المدى', 'लंबी दूरी की सटीकता'],
  ['Support', 'Apoyo', 'Soutien', 'Support', 'Suporte', 'Поддержка', '辅助', 'サポート', '서포트', 'دعم', 'सपोर्ट'],
  ['Team utility and backup', 'Utilidad y respaldo para el equipo', 'Utilitaires et renfort pour l\'équipe', 'Teamunterstützung und Rückendeckung', 'Utilidade e apoio para o time', 'Утилити и прикрытие для команды', '为团队提供道具与支援', 'チームのユーティリティと援護', '팀 유틸리티와 지원', 'دعم الفريق ومساندته', 'टीम को यूटिलिटी और बैकअप'],
  ['Rusher / Entry Fragger', 'Rusher / Entry fragger', 'Rusheur / Entry fragger', 'Rusher / Entry-Fragger', 'Rusher / Entry fragger', 'Раш-игрок / Энтри-фраггер', '突破手 / 先锋', 'ラッシャー / エントリーフラッガー', '러셔 / 엔트리 프래거', 'مندفع / مقتحم أول', 'रशर / एंट्री फ्रैगर'],
  ['First in, fastest push', 'Primero en entrar, empuje más rápido', 'Premier à entrer, poussée la plus rapide', 'Zuerst rein, schnellster Push', 'Primeiro a entrar, avanço mais rápido', 'Первым входит, быстрее всех давит', '第一个冲入，推进最快', '真っ先に突入、最速で押す', '가장 먼저 진입, 가장 빠른 푸시', 'أول من يدخل وأسرع اندفاع', 'सबसे पहले अंदर, सबसे तेज़ पुश'],
  ['Recon / Scout', 'Reconocimiento / Explorador', 'Reconnaissance / Éclaireur', 'Aufklärer / Späher', 'Reconhecimento / Batedor', 'Разведчик', '侦察兵', '偵察 / スカウト', '정찰병', 'استطلاع / كشّاف', 'रेकॉन / स्काउट'],
  ['Intel gathering, flanking', 'Recopila información, flanquea', 'Collecte d\'infos, flanc', 'Informationen sammeln, flankieren', 'Coleta informações, flanqueia', 'Сбор информации, фланги', '收集情报，迂回包抄', '情報収集とフランキング', '정보 수집, 측면 공격', 'جمع المعلومات والالتفاف', 'जानकारी जुटाना, फ़्लैंकिंग'],
  ['Flexible', 'Flexible', 'Flexible', 'Flexibel', 'Flexível', 'Универсал', '灵活多变', 'フレキシブル', '유연함', 'مرن', 'लचीला'],
  ['Adapts to team needs', 'Se adapta a lo que necesita el equipo', 'S\'adapte aux besoins de l\'équipe', 'Passt sich den Teambedürfnissen an', 'Adapta-se às necessidades do time', 'Подстраивается под нужды команды', '根据团队需要灵活调整', 'チームの必要に合わせる', '팀 상황에 맞춰 적응', 'يتكيف مع احتياجات الفريق', 'टीम की ज़रूरत के हिसाब से ढल जाता है'],

  // ── Weapon categories (generic type names only) ────────────────────────────
  ['Assault Carbines', 'Carabinas de asalto', 'Carabines d\'assaut', 'Sturmkarabiner', 'Carabinas de assalto', 'Штурмовые карабины', '突击卡宾枪', 'アサルトカービン', '돌격 카빈', 'كاربينات هجومية', 'असॉल्ट कार्बाइन'],
  ['Assault Rifles', 'Fusiles de asalto', 'Fusils d\'assaut', 'Sturmgewehre', 'Fuzis de assalto', 'Штурмовые винтовки', '突击步枪', 'アサルトライフル', '돌격소총', 'بنادق هجومية', 'असॉल्ट राइफ़लें'],
  ['Bolt-Action Rifles', 'Fusiles de cerrojo', 'Fusils à verrou', 'Repetiergewehre', 'Fuzis de ferrolho', 'Винтовки с продольно-скользящим затвором', '栓动步枪', 'ボルトアクションライフル', '볼트액션 소총', 'بنادق بمغلاق منزلق', 'बोल्ट-एक्शन राइफ़लें'],
  ['Designated Marksman Rifles', 'Fusiles de tirador designado', 'Fusils de tireur d\'élite désigné', 'Designated-Marksman-Gewehre', 'Fuzis de atirador designado', 'Винтовки designated marksman', '精确射手步枪', 'DMR（選抜射手ライフル）', '지정사수소총', 'بنادق الرماة المحددين', 'डेज़िग्नेटेड मार्क्समैन राइफ़लें'],
  ['Grenade Launchers', 'Lanzagranadas', 'Lance-grenades', 'Granatwerfer', 'Lança-granadas', 'Гранатомёты', '榴弹发射器', 'グレネードランチャー', '유탄발사기', 'قاذفات القنابل', 'ग्रेनेड लॉन्चर'],
  ['Light Machine Guns', 'Ametralladoras ligeras', 'Mitrailleuses légères', 'Leichte Maschinengewehre', 'Metralhadoras leves', 'Ручные пулемёты', '轻机枪', '軽機関銃', '경기관총', 'رشاشات خفيفة', 'लाइट मशीन गन'],
  ['Rocket Launchers', 'Lanzacohetes', 'Lance-roquettes', 'Raketenwerfer', 'Lança-foguetes', 'Ракетные установки', '火箭发射器', 'ロケットランチャー', '로켓 발사기', 'قاذفات صواريخ', 'रॉकेट लॉन्चर'],
  ['Shotguns', 'Escopetas', 'Fusils à pompe', 'Schrotflinten', 'Escopetas', 'Дробовики', '霰弹枪', 'ショットガン', '샷건', 'بنادق صيد', 'शॉटगन'],
  ['Submachine Guns', 'Subfusiles', 'Pistolets-mitrailleurs', 'Maschinenpistolen', 'Submetralhadoras', 'Пистолеты-пулемёты', '冲锋枪', 'サブマシンガン', '기관단총', 'رشاشات خفيفة قصيرة', 'सबमशीन गन'],
  ['Pistols', 'Pistolas', 'Pistolets', 'Pistolen', 'Pistolas', 'Пистолеты', '手枪', 'ピストル', '권총', 'مسدسات', 'पिस्तौलें'],
  ['Revolvers', 'Revólveres', 'Revolvers', 'Revolver', 'Revólveres', 'Револьверы', '左轮手枪', 'リボルバー', '리볼버', 'مسدسات ريفولفر', 'रिवॉल्वर'],
  ['Melee Weapons', 'Armas cuerpo a cuerpo', 'Armes de mêlée', 'Nahkampfwaffen', 'Armas corpo a corpo', 'Холодное оружие', '近战武器', '近接武器', '근접 무기', 'أسلحة قريبة المدى', 'नज़दीकी लड़ाई के हथियार'],
  ['Melee', 'Cuerpo a cuerpo', 'Mêlée', 'Nahkampf', 'Corpo a corpo', 'Ближний бой', '近战', '近接', '근접', 'قتال قريب', 'नज़दीकी लड़ाई'],
  ['Marksman Rifles', 'Fusiles de tirador', 'Fusils de précision', 'Marksman-Gewehre', 'Fuzis de atirador', 'Марксманские винтовки', '射手步枪', 'マークスマンライフル', '지정사수 소총', 'بنادق الرماة', 'मार्क्समैन राइफ़लें'],
  ['Sniper Rifles', 'Fusiles de francotirador', 'Fusils de sniper', 'Scharfschützengewehre', 'Fuzis de precisão', 'Снайперские винтовки', '狙击步枪', 'スナイパーライフル', '저격총', 'بنادق قنص', 'स्नाइपर राइफ़लें'],
  ['Battle Rifles', 'Fusiles de batalla', 'Fusils de combat', 'Kampfgewehre', 'Fuzis de batalha', 'Боевые винтовки', '战斗步枪', 'バトルライフル', '배틀 라이플', 'بنادق قتالية', 'बैटल राइफ़लें'],
  ['Carbines', 'Carabinas', 'Carabines', 'Karabiner', 'Carabinas', 'Карабины', '卡宾枪', 'カービン', '카빈', 'كاربينات', 'कार्बाइन'],
  ['Machine Guns', 'Ametralladoras', 'Mitrailleuses', 'Maschinengewehre', 'Metralhadoras', 'Пулемёты', '机枪', '機関銃', '기관총', 'رشاشات', 'मशीन गन'],
  ['Heavy Machine Guns', 'Ametralladoras pesadas', 'Mitrailleuses lourdes', 'Schwere Maschinengewehre', 'Metralhadoras pesadas', 'Тяжёлые пулемёты', '重机枪', '重機関銃', '중기관총', 'رشاشات ثقيلة', 'हैवी मशीन गन'],
  ['Handguns', 'Armas cortas', 'Armes de poing', 'Handfeuerwaffen', 'Armas de mão', 'Короткоствол', '手枪类', 'ハンドガン', '권총류', 'مسدسات يدوية', 'हैंडगन'],
  ['Hand Guns', 'Armas cortas', 'Armes de poing', 'Handfeuerwaffen', 'Armas de mão', 'Короткоствол', '手枪类', 'ハンドガン', '권총류', 'مسدسات يدوية', 'हैंडगन'],
  ['Pistols & Revolvers', 'Pistolas y revólveres', 'Pistolets et revolvers', 'Pistolen und Revolver', 'Pistolas e revólveres', 'Пистолеты и револьверы', '手枪与左轮', 'ピストルとリボルバー', '권총 및 리볼버', 'مسدسات وريفولفرات', 'पिस्तौल और रिवॉल्वर'],
  ['Throwables', 'Arrojadizos', 'Objets lançables', 'Wurfobjekte', 'Arremessáveis', 'Метательное', '投掷物', '投擲物', '투척 무기', 'أدوات رمي', 'फेंकने वाले हथियार'],
  ['Grenades', 'Granadas', 'Grenades', 'Granaten', 'Granadas', 'Гранаты', '手榴弹', 'グレネード', '수류탄', 'قنابل يدوية', 'ग्रेनेड'],
  ['Primary Weapons', 'Armas primarias', 'Armes principales', 'Primärwaffen', 'Armas primárias', 'Основное оружие', '主武器', 'メイン武器', '주무기', 'الأسلحة الأساسية', 'प्राथमिक हथियार'],
  ['Primary', 'Primaria', 'Principale', 'Primär', 'Primária', 'Основное', '主武器', 'メイン', '주무기', 'أساسي', 'प्राथमिक'],
  ['Secondary', 'Secundaria', 'Secondaire', 'Sekundär', 'Secundária', 'Дополнительное', '副武器', 'サブ', '보조무기', 'ثانوي', 'द्वितीयक'],
  ['Sidearms', 'Armas secundarias', 'Armes de poing secondaires', 'Seitenwaffen', 'Armas secundárias', 'Личное оружие', '随身武器', 'サイドアーム', '보조 화기', 'أسلحة جانبية', 'साइडआर्म'],
  ['SMGs', 'Subfusiles', 'PM', 'MPs', 'SMGs', 'ПП', '冲锋枪', 'SMG', 'SMG', 'رشاشات SMG', 'SMG'],
  ['Rifles', 'Fusiles', 'Fusils', 'Gewehre', 'Fuzis', 'Винтовки', '步枪', 'ライフル', '소총', 'بنادق', 'राइफ़लें'],
  ['Launchers', 'Lanzadores', 'Lanceurs', 'Werfer', 'Lançadores', 'Гранатомёты', '发射器', 'ランチャー', '발사기', 'قاذفات', 'लॉन्चर'],
  ['Explosive', 'Explosivos', 'Explosifs', 'Sprengstoffe', 'Explosivos', 'Взрывчатка', '爆炸物', '爆発物', '폭발물', 'متفجرات', 'विस्फोटक'],
  ['Bows & Crossbows', 'Arcos y ballestas', 'Arcs et arbalètes', 'Bögen und Armbrüste', 'Arcos e bestas', 'Луки и арбалеты', '弓与弩', '弓とクロスボウ', '활과 석궁', 'أقواس وأقواس ونشاب', 'धनुष और क्रॉसबो'],
  ['Energy Weapons', 'Armas de energía', 'Armes à énergie', 'Energiewaffen', 'Armas de energia', 'Энергетическое оружие', '能量武器', 'エナジー武器', '에너지 무기', 'أسلحة الطاقة', 'एनर्जी हथियार'],
  ['Hunting Rifles', 'Rifles de caza', 'Fusils de chasse', 'Jagdgewehre', 'Rifles de caça', 'Охотничьи ружья', '猎枪', 'ハンティングライフル', '사냥용 소총', 'بنادق صيد', 'शिकार राइफ़लें'],
  ['Machine Pistols', 'Pistolas ametralladoras', 'Pistolets mitrailleurs', 'Maschinenpistolen', 'Pistolas-metralhadoras', 'Автоматические пистолеты', '冲锋手枪', 'マシンピストル', '기관권총', 'مسدسات رشاشة', 'मशीन पिस्तौल'],
  ['Less-Lethal', 'Menos letales', 'Non létal', 'Weniger tödlich', 'Menos letais', 'Нелетальное', '非致命武器', '非殺傷', '비살상', 'أقل فتكًا', 'कम घातक'],
  ['Improvised', 'Improvisadas', 'Improvisées', 'Improvisiert', 'Improvisadas', 'Самодельное', '临时武器', '即席武器', '임시 무기', 'مرتجلة', 'जुगाड़ू हथियार'],
  ['Firearms', 'Armas de fuego', 'Armes à feu', 'Schusswaffen', 'Armas de fogo', 'Огнестрельное оружие', '枪械', '銃器', '총기류', 'أسلحة نارية', 'आग्नेयास्त्र'],
  ['Long Guns', 'Armas largas', 'Armes longues', 'Langwaffen', 'Armas longas', 'Длинноствольное оружие', '长枪', '長物', '장총류', 'أسلحة طويلة', 'लंबी बंदूकें'],
  ['Heavy Weapons', 'Armas pesadas', 'Armes lourdes', 'Schwere Waffen', 'Armas pesadas', 'Тяжёлое оружие', '重型武器', '重火器', '중화기', 'أسلحة ثقيلة', 'भारी हथियार'],
  ['Standard Firearms', 'Armas de fuego estándar', 'Armes à feu standard', 'Standard-Schusswaffen', 'Armas de fogo padrão', 'Стандартное огнестрельное оружие', '标准枪械', '標準銃器', '표준 총기', 'أسلحة نارية قياسية', 'मानक आग्नेयास्त्र'],
  ['Starting Weapons', 'Armas iniciales', 'Armes de départ', 'Startwaffen', 'Armas iniciais', 'Стартовое оружие', '初始武器', '初期武器', '시작 무기', 'أسلحة البداية', 'शुरुआती हथियार'],
  ['Power Weapons', 'Armas de poder', 'Armes de puissance', 'Power-Waffen', 'Armas de poder', 'Мощное оружие', '强力武器', 'パワーウェポン', '파워 무기', 'أسلحة القوة', 'पावर हथियार'],
  ['Pickup Weapons', 'Armas del suelo', 'Armes à ramasser', 'Aufsammelbare Waffen', 'Armas de pickup', 'Подбираемое оружие', '拾取武器', '拾得武器', '획득 무기', 'أسلحة قابلة للالتقاط', 'उठाने वाले हथियार'],
]

function build(): Namespace {
  const out: Namespace = {}
  LANG_ORDER.forEach((lang, i) => {
    const dict: Record<string, string> = {}
    for (const row of ROWS) dict[row[0]] = row[i + 1]
    out[lang] = dict
  })
  return out
}

export const profile: Namespace = build()
