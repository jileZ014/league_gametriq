import * as React from 'react'

export const Switch = ({checked, onCheckedChange}: {checked?: boolean, onCheckedChange?: (checked: boolean) => void}) => (
  <button 
    onClick={() => onCheckedChange?.(!checked)} 
    className={`w-11 h-6 rounded-full ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
  >
    <span className={`block w-5 h-5 bg-white rounded-full transform transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
)
