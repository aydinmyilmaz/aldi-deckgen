'use client';

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { SlideCard } from './SlideCard';
import type { SlideOutline } from '@/types';

interface Props {
  slides: SlideOutline[];
  onChange: (slides: SlideOutline[]) => void;
}

export function SlideList({ slides, onChange }: Props) {
  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const reordered = Array.from(slides);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onChange(reordered.map((s, i) => ({ ...s, index: i + 1 })));
  }

  function handleUpdate(updated: SlideOutline) {
    onChange(slides.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleDelete(id: string) {
    onChange(
      slides
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, index: i + 1 }))
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="slides">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-4"
          >
            {slides.map((slide, index) => (
              <Draggable key={slide.id} draggableId={slide.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className="fade-in-up"
                  >
                    <SlideCard
                      slide={slide}
                      dragHandleProps={provided.dragHandleProps}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
