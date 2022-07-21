import * as React from 'react'
import { TLViewport, TLBounds, debounce } from '@tldraw/core'
import { useApp } from './useApp'

const getNearestScrollableContainer = (element: HTMLElement): HTMLElement | Document => {
  let parent = element.parentElement
  while (parent) {
    if (parent === document.body) {
      return document
    }
    const { overflowY } = window.getComputedStyle(parent)
    const hasScrollableContent = parent.scrollHeight > parent.clientHeight
    if (
      hasScrollableContent &&
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
    ) {
      return parent
    }
    parent = parent.parentElement
  }
  return document
}

export function useResizeObserver<T extends HTMLElement>(
  ref: React.RefObject<T>,
  viewport: TLViewport,
  onBoundsChange?: (bounds: TLBounds) => void
) {
  const app = useApp()
  const rIsMounted = React.useRef(false)

  // When the element resizes, update the bounds (stored in inputs)
  // and broadcast via the onBoundsChange callback prop.
  const updateBounds = React.useCallback(() => {
    if (rIsMounted.current) {
      const rect = ref.current?.getBoundingClientRect()

      if (rect) {
        const bounds: TLBounds = {
          minX: rect.left,
          maxX: rect.left + rect.width,
          minY: rect.top,
          maxY: rect.top + rect.height,
          width: rect.width,
          height: rect.height,
        }

        viewport.updateBounds(bounds)
        onBoundsChange?.(bounds)
      }
    } else {
      // Skip the first mount
      rIsMounted.current = true
    }
  }, [ref, onBoundsChange])

  React.useEffect(() => {
    const scrollingAnchor = ref.current ? getNearestScrollableContainer(ref.current) : document
    const debouncedupdateBounds = debounce(updateBounds, 100)
    scrollingAnchor.addEventListener('scroll', debouncedupdateBounds)
    window.addEventListener('resize', debouncedupdateBounds)
    return () => {
      scrollingAnchor.removeEventListener('scroll', debouncedupdateBounds)
      window.removeEventListener('resize', debouncedupdateBounds)
    }
  }, [])

  React.useLayoutEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0].contentRect) {
        updateBounds()
      }
    })

    if (ref.current) {
      resizeObserver.observe(ref.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [ref])

  React.useLayoutEffect(() => {
    updateBounds()
    setTimeout(() => {
      if (app.selectedIds.size) {
        app.api.zoomToSelection()
      } else {
        app.api.cameraToCenter()
      }
    }, 50)
  }, [ref])
}
