import type { GameRecord } from '../game/types'

const RECORDS_KEY = 'go_records'
const MAX_RECORDS = 50

export function saveRecord(record: GameRecord) {
  const records = loadRecords()
  records.unshift(record)
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}

export function loadRecords(): GameRecord[] {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]')
  } catch {
    return []
  }
}

export function deleteRecord(id: string) {
  const records = loadRecords().filter((record) => record.id !== id)
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}
