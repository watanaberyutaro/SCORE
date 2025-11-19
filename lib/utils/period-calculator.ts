/**
 * 設立年月から現在の期を計算するユーティリティ関数
 */

export interface PeriodInfo {
  periodNumber: number // 期の番号（例: 9期）
  periodName: string // 期の名前（例: "第9期"）
  startDate: Date // 期の開始日
  endDate: Date // 期の終了日
  currentMonth: number // 期内の現在の月（1-12）
  quarterNumber: number // 四半期の番号（1-4）
  quarterName: string // 四半期の名前（例: "第1四半期"）
}

/**
 * 設立年月から指定した日付時点の期情報を計算
 * @param establishmentDate 設立年月（YYYY-MM-DD形式の文字列またはDate）
 * @param targetDate 計算対象の日付（省略時は現在日時）
 * @returns 期情報
 */
export function calculatePeriod(
  establishmentDate: string | Date,
  targetDate: Date = new Date()
): PeriodInfo {
  const establishment = typeof establishmentDate === 'string'
    ? new Date(establishmentDate)
    : establishmentDate

  // 設立月を取得（0-11）
  const establishmentMonth = establishment.getMonth()
  const establishmentYear = establishment.getFullYear()

  // 現在の年月
  const currentYear = targetDate.getFullYear()
  const currentMonth = targetDate.getMonth()

  // 設立から現在までの経過月数を計算
  const monthsPassed = (currentYear - establishmentYear) * 12 + (currentMonth - establishmentMonth)

  // 期の番号を計算（1期目から開始）
  const periodNumber = Math.floor(monthsPassed / 12) + 1

  // 現在の期の開始年を計算
  const periodStartYear = establishmentYear + (periodNumber - 1)
  // 時刻を12:00に設定してタイムゾーンの影響を回避
  const periodStartDate = new Date(periodStartYear, establishmentMonth, 1, 12, 0, 0)

  // 期の終了日（開始日の11ヶ月後の月末）
  // 次の年の同じ月の0日目 = 前月の末日（つまり期の最終日）
  const periodEndDate = new Date(periodStartYear + 1, establishmentMonth, 0, 12, 0, 0)

  // 期内の現在の月（1-12）
  const monthInPeriod = (monthsPassed % 12) + 1

  // 四半期の番号を計算（1-4）
  const quarterNumber = Math.floor((monthInPeriod - 1) / 3) + 1
  const quarterName = `第${quarterNumber}四半期`

  return {
    periodNumber,
    periodName: `第${periodNumber}期`,
    startDate: periodStartDate,
    endDate: periodEndDate,
    currentMonth: monthInPeriod,
    quarterNumber,
    quarterName,
  }
}

/**
 * 特定の期の情報を取得
 * @param establishmentDate 設立年月
 * @param periodNumber 取得したい期の番号
 * @returns 期情報
 */
export function getPeriodInfo(
  establishmentDate: string | Date,
  periodNumber: number
): Omit<PeriodInfo, 'currentMonth' | 'quarterNumber' | 'quarterName'> {
  const establishment = typeof establishmentDate === 'string'
    ? new Date(establishmentDate)
    : establishmentDate

  const establishmentMonth = establishment.getMonth()
  const establishmentYear = establishment.getFullYear()

  // 指定期の開始年
  const periodStartYear = establishmentYear + (periodNumber - 1)
  // 時刻を12:00に設定してタイムゾーンの影響を回避
  const periodStartDate = new Date(periodStartYear, establishmentMonth, 1, 12, 0, 0)

  // 期の終了日（次の年の同じ月の0日目 = 前月の末日）
  const periodEndDate = new Date(periodStartYear + 1, establishmentMonth, 0, 12, 0, 0)

  return {
    periodNumber,
    periodName: `第${periodNumber}期`,
    startDate: periodStartDate,
    endDate: periodEndDate,
  }
}

/**
 * 指定期の全ての月を取得
 * @param establishmentDate 設立年月
 * @param periodNumber 期の番号
 * @returns 月の配列（各月の情報を含む）
 */
export function getPeriodMonths(
  establishmentDate: string | Date,
  periodNumber: number
): Array<{
  year: number
  month: number
  label: string
  quarterNumber: number
  quarterName: string
}> {
  const { startDate, endDate } = getPeriodInfo(establishmentDate, periodNumber)
  const months: Array<{
    year: number
    month: number
    label: string
    quarterNumber: number
    quarterName: string
  }> = []

  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const monthIndex = months.length
    const quarterNumber = Math.floor(monthIndex / 3) + 1

    months.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      label: `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`,
      quarterNumber,
      quarterName: `第${quarterNumber}四半期`,
    })

    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return months
}

/**
 * 四半期ごとの月をグループ化
 * @param establishmentDate 設立年月
 * @param periodNumber 期の番号
 * @returns 四半期ごとにグループ化された月の配列
 */
export function getQuarterlyGroups(
  establishmentDate: string | Date,
  periodNumber: number
): Array<{
  quarterNumber: number
  quarterName: string
  months: Array<{ year: number; month: number; label: string }>
}> {
  const allMonths = getPeriodMonths(establishmentDate, periodNumber)

  const quarters: Array<{
    quarterNumber: number
    quarterName: string
    months: Array<{ year: number; month: number; label: string }>
  }> = []

  for (let q = 1; q <= 4; q++) {
    const quarterMonths = allMonths.filter(m => m.quarterNumber === q)
    quarters.push({
      quarterNumber: q,
      quarterName: `第${q}四半期`,
      months: quarterMonths.map(({ year, month, label }) => ({ year, month, label })),
    })
  }

  return quarters
}

/**
 * 利用可能な全ての期を取得
 * @param establishmentDate 設立年月
 * @param maxPeriods 取得する最大期数（省略時は現在の期まで）
 * @returns 期の配列
 */
export function getAllPeriods(
  establishmentDate: string | Date,
  maxPeriods?: number
): Array<Omit<PeriodInfo, 'currentMonth' | 'quarterNumber' | 'quarterName'>> {
  const currentPeriod = calculatePeriod(establishmentDate)
  const totalPeriods = maxPeriods ?? currentPeriod.periodNumber

  const periods: Array<Omit<PeriodInfo, 'currentMonth' | 'quarterNumber' | 'quarterName'>> = []

  for (let i = 1; i <= totalPeriods; i++) {
    periods.push(getPeriodInfo(establishmentDate, i))
  }

  return periods
}
