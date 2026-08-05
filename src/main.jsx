import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Download, FileCode2, FileText, Plus, Check, Trash2 } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import './styles.css'

const starter = {
  title: 'Availability — Kainoa Newton',
  paragraphs: [
    'I am availble week days after practice, at 6 pm ish. On Fridays I\'m available the whole day besides 4:30 to 6 pm. And on Saturday and Sunday I\'m available after 11am. Keep in mind I will have Track/Cross Country meets some weekends (normally only takes up part of Saturday, sometimes Sunday aswell though).',
    'Kainoa Newton',
  ],
}

function download(name, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}

function htmlFor(doc) {
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${doc.title}</title>\n<style>body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.45;color:#111;margin:.8in}p{margin:0 0 14px}</style>\n</head>\n<body>\n<h1 style="font-size:20pt;margin:0 0 24px">${doc.title}</h1>\n${doc.paragraphs.map((p) => `<p>${p}</p>`).join('\n')}\n</body>\n</html>`
}

function App() {
  const [doc, setDoc] = useState(starter)
  const [saved, setSaved] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const canvasRef = useRef(null)
  const exportRef = useRef(null)
  const paragraphRefs = useRef([])
  const wordCount = useMemo(() => doc.paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length, [doc.paragraphs])

  useEffect(() => {
    const onShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setMenuOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [])

  const update = (key, value) => { setDoc((d) => ({ ...d, [key]: value })); setSaved(false) }
  const updateParagraph = (index, value) => { setDoc((d) => ({ ...d, paragraphs: d.paragraphs.map((p, i) => i === index ? value : p) })); setSaved(false) }
  const addParagraph = () => { setDoc((d) => ({ ...d, paragraphs: [...d.paragraphs, ''] })); setSaved(false) }
  const splitParagraph = (index, event) => {
    if (event.shiftKey) return
    event.preventDefault()
    const field = event.currentTarget
    const before = field.value.slice(0, field.selectionStart)
    const after = field.value.slice(field.selectionEnd)
    setDoc((d) => ({ ...d, paragraphs: d.paragraphs.flatMap((paragraph, paragraphIndex) => paragraphIndex === index ? [before, after] : [paragraph]) }))
    setSaved(false)
    window.setTimeout(() => {
      paragraphRefs.current[index + 1]?.focus()
      paragraphRefs.current[index + 1]?.setSelectionRange(0, 0)
    }, 0)
  }
  const deleteEmptyParagraph = (index, event) => {
    if (event.currentTarget.value !== '' || !['Backspace', 'Delete'].includes(event.key) || doc.paragraphs.length === 1) return
    event.preventDefault()
    const targetIndex = index > 0 ? index - 1 : 0
    setDoc((d) => ({ ...d, paragraphs: d.paragraphs.filter((_, paragraphIndex) => paragraphIndex !== index) }))
    setSaved(false)
    window.setTimeout(() => {
      const target = paragraphRefs.current[targetIndex]
      target?.focus()
      const end = target?.value.length ?? 0
      target?.setSelectionRange(end, end)
    }, 0)
  }
  const removeParagraph = (index) => { if (doc.paragraphs.length === 1) return; setDoc((d) => ({ ...d, paragraphs: d.paragraphs.filter((_, i) => i !== index) })); setSaved(false) }
  const exportFile = (format) => {
    if (format === 'pdf') {
      const exportNode = document.createElement('div')
      exportNode.innerHTML = `<h1 style="font:600 20pt Georgia,serif;margin:0 0 24px">${doc.title}</h1>${doc.paragraphs.map((paragraph) => `<p style="font:12pt Arial,sans-serif;line-height:1.45;margin:0 0 14px">${paragraph}</p>`).join('')}`
      Object.assign(exportNode.style, { position: 'fixed', left: '-10000px', top: '0', width: '7in', padding: '.8in', background: '#fff', color: '#111' })
      document.body.appendChild(exportNode)
      html2pdf().set({ margin: 0, filename: `${doc.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter' } }).from(exportNode).save().then(() => exportNode.remove())
    } else if (format === 'html') download('paperline.html', htmlFor(doc), 'text/html')
    else if (format === 'markdown') download('paperline.md', `# ${doc.title}\n\n${doc.paragraphs.join('\n\n')}`, 'text/markdown')
    else download('paperline.txt', `${doc.title}\n\n${doc.paragraphs.join('\n\n')}`, 'text/plain')
    setMenuOpen(false); setSaved(true)
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand">simple composer</div>
      <input className="top-title" value={doc.title} onChange={(e) => update('title', e.target.value)} aria-label="Document title" />
      <div className="top-actions">
        <span className={`save-state ${saved ? 'is-saved' : ''}`}><span className="save-dot">{saved ? <Check size={11} /> : null}</span>{saved ? 'Saved' : 'Unsaved changes'}</span>
        <div className="export-wrap" ref={exportRef}>
          <button className="button button-primary" onClick={() => setMenuOpen((v) => !v)}><Download size={15} />Export</button>
          {menuOpen && <div className="export-menu" role="menu">
            <button onClick={() => exportFile('pdf')}><FileText size={15} /><span>PDF</span><small>Print-ready</small></button>
            <button onClick={() => exportFile('html')}><FileCode2 size={15} /><span>HTML</span><small>Editable source</small></button>
            <button onClick={() => exportFile('markdown')}><span className="format-icon">M↓</span><span>Markdown</span><small>Plain formatting</small></button>
            <button onClick={() => exportFile('txt')}><span className="format-icon">TXT</span><span>Text file</span><small>Universal</small></button>
          </div>}
        </div>
      </div>
    </header>

    <main className="workspace">
      <section className="editor-card">
        <div className="paper" ref={canvasRef}>
          <div className="paragraphs" style={{ gap: '14px' }}>
            {doc.paragraphs.map((paragraph, index) => <div className="paragraph-row" key={index}>
              <textarea ref={(element) => { paragraphRefs.current[index] = element }} value={paragraph} placeholder="Start writing here…" onKeyDown={(e) => { deleteEmptyParagraph(index, e); if (e.defaultPrevented) return; if (e.key === 'Enter') splitParagraph(index, e) }} onChange={(e) => updateParagraph(index, e.target.value)} aria-label={`Paragraph ${index + 1}`} rows={Math.max(1, Math.ceil(paragraph.length / 80))} />
              <button className="remove-button" onClick={() => removeParagraph(index)} aria-label="Remove paragraph"><Trash2 size={14} /></button>
            </div>)}
          </div>
          <button className="add-paragraph" onClick={addParagraph}><Plus size={15} />Add paragraph</button>
        </div>
        <footer className="paper-footer"><span>{wordCount} words</span><span>Last edited just now</span></footer>
      </section>
    </main>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
