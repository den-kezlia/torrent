"use client"
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SearchScroller() {
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if any search parameters are present that would indicate a search was performed
    const hasSearchParams = searchParams.get('search') || 
                           searchParams.get('status') || 
                           searchParams.get('hasPhotos') || 
                           searchParams.get('hasNotes') || 
                           searchParams.get('nearby') ||
                           searchParams.get('page')

    if (hasSearchParams) {
      // Small delay to ensure the page has rendered
      setTimeout(() => {
        const resultsSection = document.getElementById('search-results')
        if (resultsSection) {
          resultsSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          })
        }
      }, 100)
    }
  }, [searchParams])

  return null // This component doesn't render anything
}
