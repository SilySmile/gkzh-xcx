// 活动反馈选择规则；服务端仍会独立校验，客户端用于即时提示。
export function toggleFeedbackOption(question, current, code) {
	const selected = current.slice()
	if (selected.includes(code)) return { selected: selected.filter(value => value !== code) }
	if (code === question.exclusiveOption) return { selected: [code] }
	const next = selected.filter(value => value !== question.exclusiveOption)
	if (next.length >= question.maxSelections) return { selected, error: `第${question.questionNo}题最多选择${question.maxSelections}项` }
	return { selected: next.concat(code) }
}

export function validateFeedbackAnswers(questions, answers) {
	for (const question of questions) {
		const no = question.questionNo
		const selected = question.type === 'single' ? [answers[`question${no}Answer`]].filter(Boolean) : (answers[`question${no}Answers`] || [])
		if (!selected.length) return `请回答第${no}题`
		if (selected.length > question.maxSelections) return `第${no}题最多选择${question.maxSelections}项`
		if (selected.includes(question.exclusiveOption) && selected.length > 1) return `第${no}题的暂无选项不能与其他选项同时选择`
		if (new Set(selected).size !== selected.length || selected.some(code => !question.options.some(option => option.code === code))) return `第${no}题包含无效选项`
		if (selected.includes('OTHER') && !String(answers[`question${no}Other`] || '').trim()) return `请填写第${no}题的其他内容`
	}
	return ''
}
