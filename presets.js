// Curated, local-only quick starts. Personal names and issuer fields are deliberately not overwritten.
const starterKits={
  math:[
    {id:"first",icon:"✏️",title:"Первые примеры",description:"1 класс · до 10",values:{grade:"1 класс",count:"12",level:"Простые",max:"10",key:"Нет"}},
    {id:"brackets",icon:"🧩",title:"Со скобками",description:"2 класс · с ответами",values:{grade:"2 класс",count:"16",level:"Со скобками",max:"20",key:"Да"}},
    {id:"practice",icon:"🎯",title:"Большая тренировка",description:"5 класс · 40 заданий",values:{grade:"5 класс",count:"40",level:"Несколько действий",max:"100",key:"Да"}}
  ],
  cards:[
    {id:"animals",icon:"🐾",title:"Животные",description:"8 английских слов",values:{title:"Английский · животные",items:"cat — кошка\ndog — собака\nbird — птица\nfish — рыба\nhorse — лошадь\nmouse — мышь\nrabbit — кролик\nbear — медведь",theme:"Мятный"}},
    {id:"colors",icon:"🌈",title:"Цвета",description:"8 слов для запоминания",values:{title:"Английский · цвета",items:"red — красный\nblue — синий\ngreen — зелёный\nyellow — жёлтый\nwhite — белый\nblack — чёрный\npink — розовый\npurple — фиолетовый",theme:"Персиковый"}},
    {id:"weekdays",icon:"📆",title:"Дни недели",description:"7 полезных карточек",values:{title:"Английский · дни недели",items:"Monday — понедельник\nTuesday — вторник\nWednesday — среда\nThursday — четверг\nFriday — пятница\nSaturday — суббота\nSunday — воскресенье",theme:"Лавандовый"}}
  ],
  labels:[
    {id:"notebooks",icon:"📒",title:"Для тетрадей",description:"12 школьных наклеек",values:{subtitle:"Тетрадь",count:"12",layout:"Школьный",size:"Стандартные 54 × 38 мм",theme:"Лавандовый"}},
    {id:"stationery",icon:"✏️",title:"Для мелочей",description:"32 компактные наклейки",values:{subtitle:"Мои принадлежности",count:"32",layout:"Классический",size:"Маленькие 40 × 22 мм",theme:"Мятный"}},
    {id:"folders",icon:"🗂️",title:"Для папок",description:"8 крупных наклеек",values:{subtitle:"Школьные работы",count:"8",layout:"Нежный",size:"Крупные 80 × 48 мм",theme:"Персиковый"}}
  ],
  diploma:[
    {id:"effort",icon:"🌟",title:"За старание",description:"Тёплая похвала",values:{kind:"Грамота",reason:"За старание, трудолюбие и упорство в учёбе!",layout:"Торжественный",theme:"Лавандовый"}},
    {id:"reader",icon:"📚",title:"Юный читатель",description:"Для любителей книг",values:{kind:"Диплом",reason:"За любовь к чтению и новые книжные открытия!",layout:"Детский",theme:"Мятный"}},
    {id:"champion",icon:"🏅",title:"За достижения",description:"Для конкурсов и секций",values:{kind:"Сертификат",reason:"За целеустремлённость и прекрасные результаты!",layout:"Современный",theme:"Персиковый"}}
  ],
  schedule:[
    {id:"school",icon:"🎒",title:"Школьная неделя",description:"5 дней · основные уроки",values:{title:"Расписание уроков",items:"Математика, Русский язык, Чтение, Окружающий мир\nМатематика, Английский, ИЗО, Физкультура\nРусский язык, Математика, Музыка, Чтение\nМатематика, Литература, Технология, Физкультура\nРусский язык, Английский, Чтение, Окружающий мир",theme:"Лавандовый"}},
    {id:"after",icon:"🎨",title:"После уроков",description:"Кружки и свободное время",values:{title:"После школы",items:"Домашнее задание, Прогулка\nМузыкальная школа, Чтение\nДомашнее задание, Рисование\nСпорт, Свободное время\nПодготовка к выходным, Настольные игры",theme:"Мятный"}},
    {id:"family",icon:"🏡",title:"Планы на неделю",description:"7 дней · для всей семьи",values:{title:"Наши планы на неделю",items:"Школа, Домашние дела\nШкола, Прогулка\nШкола, Хобби\nШкола, Спорт\nШкола, Семейный вечер\nПрогулка, Встречи\nОтдых, Подготовка к неделе",theme:"Персиковый"}}
  ],
  habits:[
    {id:"healthy",icon:"🌿",title:"Полезные привычки",description:"30 дней · 4 привычки",values:{title:"Мои полезные привычки",items:"Делать зарядку\nЧитать 15 минут\nГулять на свежем воздухе\nЛожиться вовремя",days:"30",month:"Без календаря",theme:"Мятный"}},
    {id:"school",icon:"📖",title:"Учёба без спешки",description:"30 дней · школьный трекер",values:{title:"Мой учебный прогресс",items:"Повторять правила\nЧитать каждый день\nСобирать портфель вечером\nПроверять домашнее задание",days:"30",month:"Без календаря",theme:"Лавандовый"}},
    {id:"week",icon:"☀️",title:"Маленькая неделя",description:"7 дней · простой старт",values:{title:"Моя неделя",items:"Зарядка\nЧтение\nРанний сон",days:"7",month:"Без календаря",theme:"Персиковый"}}
  ]
};

// Additional ready-to-print ideas for the visual gallery.
starterKits.math.push({id:"second-grade",icon:"📐",title:"Устный счёт",description:"2 класс · 20 примеров до 50",values:{grade:"2 класс",count:"20",level:"Несколько действий",max:"50",key:"Да"}});
starterKits.cards.push({id:"greetings",icon:"👋",title:"Английские фразы",description:"8 фраз для начинающих",values:{title:"Английский · общение",items:"Hello! — Привет!\nGood morning! — Доброе утро!\nThank you! — Спасибо!\nPlease — Пожалуйста\nGoodbye! — До свидания!\nHow are you? — Как дела?\nI'm fine — У меня всё хорошо\nSee you! — Увидимся!",theme:"Мятный"}});
starterKits.labels.push({id:"art",icon:"🎨",title:"Для творчества",description:"12 наклеек для коробок и альбомов",values:{subtitle:"Творчество",count:"12",layout:"Нежный",size:"Стандартные 54 × 38 мм",theme:"Персиковый"}});
starterKits.diploma.push({id:"kindness",icon:"💛",title:"За доброту",description:"Грамота за хорошие поступки",values:{kind:"Грамота",reason:"За доброту, отзывчивость и заботу о других!",layout:"Детский",theme:"Персиковый"}});
starterKits.schedule.push({id:"morning",icon:"🌤️",title:"Утро без спешки",description:"5 дней · утренние дела",values:{title:"Моё доброе утро",items:"Проснуться, Умыться, Завтрак, Собрать рюкзак\nПроснуться, Зарядка, Завтрак, Проверить вещи\nПроснуться, Умыться, Завтрак, Пойти в школу\nПроснуться, Зарядка, Завтрак, Собрать рюкзак\nПроснуться, Умыться, Завтрак, Проверить вещи",theme:"Мятный"}});
starterKits.habits.push({id:"reading",icon:"📚",title:"Марафон чтения",description:"14 дней · маленькие шаги",values:{title:"14 дней с книгой",items:"Читать 10 минут\nПересказать прочитанное\nЗаписать новое слово",days:"14",month:"Без календаря",theme:"Лавандовый"}});
