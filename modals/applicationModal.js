const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

const QUESTIONS = {
    en: [
        { id: 'discordUsername', label: 'Discord Username', style: TextInputStyle.Short },
        { id: 'age', label: 'Age', style: TextInputStyle.Short },
        { id: 'country', label: 'Country', style: TextInputStyle.Short },
        { id: 'timezone', label: 'Time Zone', style: TextInputStyle.Short },
        { id: 'serverTime', label: 'How long on server?', style: TextInputStyle.Short },

        { id: 'staffExperience', label: 'Previous Staff Experience', style: TextInputStyle.Paragraph },
        { id: 'whyAdmin', label: 'Why become an Admin?', style: TextInputStyle.Paragraph },
        { id: 'whyChooseYou', label: 'Why should we choose you?', style: TextInputStyle.Paragraph },
        { id: 'hoursActive', label: 'Hours active per day', style: TextInputStyle.Short },
        { id: 'ruleBreak', label: 'How would you handle rule breakers?', style: TextInputStyle.Paragraph },

        { id: 'staffAbuse', label: 'If staff abuse permissions?', style: TextInputStyle.Paragraph },
        { id: 'conflict', label: 'Handle member conflict', style: TextInputStyle.Paragraph },
        { id: 'strengths', label: 'Strengths', style: TextInputStyle.Paragraph },
        { id: 'weaknesses', label: 'Weaknesses', style: TextInputStyle.Paragraph },
        { id: 'anythingElse', label: 'Anything else?', style: TextInputStyle.Paragraph }
    ],

    ar: [
        { id: 'discordUsername', label: 'اسمك في ديسكورد', style: TextInputStyle.Short },
        { id: 'age', label: 'العمر', style: TextInputStyle.Short },
        { id: 'country', label: 'البلد', style: TextInputStyle.Short },
        { id: 'timezone', label: 'المنطقة الزمنية', style: TextInputStyle.Short },
        { id: 'serverTime', label: 'منذ متى في السيرفر؟', style: TextInputStyle.Short },

        { id: 'staffExperience', label: 'هل لديك خبرة إدارية؟', style: TextInputStyle.Paragraph },
        { id: 'whyAdmin', label: 'لماذا تريد أن تصبح إداريًا؟', style: TextInputStyle.Paragraph },
        { id: 'whyChooseYou', label: 'لماذا يجب اختيارك؟', style: TextInputStyle.Paragraph },
        { id: 'hoursActive', label: 'كم ساعة يوميًا؟', style: TextInputStyle.Short },
        { id: 'ruleBreak', label: 'كيف ستتعامل مع مخالف؟', style: TextInputStyle.Paragraph },

        { id: 'staffAbuse', label: 'إذا أساء إداري استخدام صلاحياته؟', style: TextInputStyle.Paragraph },
        { id: 'conflict', label: 'كيف تحل مشكلة بين عضوين؟', style: TextInputStyle.Paragraph },
        { id: 'strengths', label: 'نقاط قوتك', style: TextInputStyle.Paragraph },
        { id: 'weaknesses', label: 'نقاط ضعفك', style: TextInputStyle.Paragraph },
        { id: 'anythingElse', label: 'هل لديك شيء آخر؟', style: TextInputStyle.Paragraph }
    ]
};

const QUESTIONS_PER_MODAL = 5;

function buildQuestionsModal(language = "en", step = 1) {
    const lang = language === "ar" ? "ar" : "en";

    const questions = QUESTIONS[lang];

    const start = (step - 1) * QUESTIONS_PER_MODAL;
    const end = start + QUESTIONS_PER_MODAL;

    const currentQuestions = questions.slice(start, end);

    if (currentQuestions.length === 0) {
        throw new Error(`No questions found for step ${step}`);
    }

    const modal = new ModalBuilder()
        .setCustomId(`application_modal_${lang}_${step}`)
        .setTitle(lang === "ar" ? "طلب إدارة" : "Admin Application");

    for (const question of currentQuestions) {
        const input = new TextInputBuilder()
            .setCustomId(question.id)
            .setLabel(question.label)
            .setStyle(question.style)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );
    }

    return modal;
}

function getStepIds(language = "en", step = 1) {
    const lang = language === "ar" ? "ar" : "en";

    const start = (step - 1) * QUESTIONS_PER_MODAL;
    const end = start + QUESTIONS_PER_MODAL;

    return QUESTIONS[lang]
        .slice(start, end)
        .map(q => q.id);
}

function totalSteps() {
    return Math.ceil(QUESTIONS.en.length / QUESTIONS_PER_MODAL);
}

module.exports = {
    buildQuestionsModal,
    getStepIds,
    totalSteps
};