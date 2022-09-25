import React, { DragEvent, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react'
import { Editor as TiptapEditor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { load, save } from './storage';
import './Editor.css';
import Focus from '@tiptap/extension-focus';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Image from '@tiptap/extension-image';
import { TimedTask } from './tasks/TimedTask';

const PLACEHOLDER_TEXT = `Welcome to your TabSpace!

Treat this as your own little scratchspace in the comfort of your new tab page.

- Markdown-like syntax is supported and notes are saved in real-time.
- To create a new to-do task, write (due <deadline>) in a block.

This is your new digital home, set it up however you'd like!
`

export interface Tasks {
  due: number, // JS date in milliseconds past epoch
  uid: string,
}

interface IEditor {
  setTasks: (cb: ((tasks: Tasks[]) => Tasks[])) => void,
}

const Editor = ({ setTasks }: IEditor) => {
  const refreshTasks = (editor: TiptapEditor) => {
    const newTasks: Tasks[] = []
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'text') {
        const timeMark = node.marks.find((mark) => mark.type.name === 'timedTask');
        if (timeMark !== undefined) {
          newTasks.push({ due: timeMark.attrs.time, uid: timeMark.attrs.uid })
        }
      }
    });

    setTasks((oldTasks: Tasks[]) => {
      if (JSON.stringify(oldTasks) !== JSON.stringify(newTasks)) {
        return newTasks;
      } else {
        return oldTasks;
      }
    })
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'highlight'
          }
        }
      }),
      Focus.configure({
        mode: 'deepest',
      }),
      Link.configure({
        protocols: ['mailto'],
      }),
      Placeholder.configure({
        placeholder: PLACEHOLDER_TEXT,
      }),
      Typography,
      Image,
      TimedTask,
    ],
    content: load(),
    onCreate: ({ editor }) => refreshTasks(editor),
    onUpdate: ({ editor }) => {
      refreshTasks(editor);
      save(editor.getJSON())
    }
  });

  useEffect(() => {
    const updateClosure = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      if (event.key === 'blocks' && event.newValue !== null) {
        if (editor) {
          editor.commands.setContent(JSON.parse(event.newValue));
          refreshTasks(editor);
        }
      }
    };
    window.addEventListener('storage', updateClosure);
    return () => window.removeEventListener('storage', updateClosure);
  }, [editor]);

  const handleDrop = (evt: DragEvent) => {
    evt.preventDefault();
    evt.stopPropagation();
    const fileList = evt.dataTransfer.files;
    if (fileList.length >= 1) {
      const file = fileList[0];
      const reader = new FileReader();
      reader.addEventListener('load', (evt) => {
        if (evt.target && editor) {
          const uploaded_image = "" + evt.target.result;
          editor.chain().focus().setImage({ src: uploaded_image }).run()
        }
      });
      reader.readAsDataURL(file);
    }
  }

  if (!editor) {
    return null
  }

  return (
    <EditorContent onDrop={handleDrop} editor={editor} />
  )
}

export default Editor;
