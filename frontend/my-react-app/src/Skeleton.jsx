import React from 'react'

const Skeleton = () => {
  return (
    <div role="status" className="max-w-sm animate-pulse">
    <div className="h-4 bg-gray-400 rounded-full dark:bg-gray-700 max-w-[450px] mb-2.5"></div>
    <div className="h-4 bg-gray-400 rounded-full dark:bg-gray-700 max-w-[450px] mb-2.5"></div>
    <span className="sr-only">Loading...</span>
</div>
  )
}

export default Skeleton