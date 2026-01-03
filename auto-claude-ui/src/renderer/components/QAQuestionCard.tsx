/**
 * QAQuestionCard - Display and respond to QA clarifying questions
 *
 * When the QA agent encounters ambiguity during review, it can pause and
 * ask the user for clarification. This component displays the question
 * and allows the user to respond.
 */

import React, { useState } from 'react';
import { HelpCircle, Send, MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { QAQuestion } from '../../shared/types/task';

interface QAQuestionCardProps {
  question: QAQuestion;
  onAnswer: (answer: string) => void;
  isSubmitting?: boolean;
}

export function QAQuestionCard({ question, onAnswer, isSubmitting = false }: QAQuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customAnswer, setCustomAnswer] = useState('');

  const hasOptions = question.options && question.options.length > 0;

  const handleSubmit = () => {
    // If user selected an option, use that; otherwise use custom answer
    const answer = selectedOption || customAnswer;
    if (answer.trim()) {
      onAnswer(answer.trim());
    }
  };

  const canSubmit = (selectedOption || customAnswer.trim()) && !isSubmitting;

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <HelpCircle className="h-5 w-5 text-yellow-500" />
          QA Needs Your Input
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Context Section */}
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">Context</Label>
          <p className="text-sm text-foreground/90 bg-muted/30 rounded-lg p-3">
            {question.context || 'The QA agent is reviewing the implementation.'}
          </p>
        </div>

        {/* Question Section */}
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">Question</Label>
          <div className="flex items-start gap-2 bg-card rounded-lg p-3 border border-border">
            <MessageSquare className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-foreground">
              {question.question}
            </p>
          </div>
        </div>

        {/* Reason Section (collapsible/subtle) */}
        {question.reason && (
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              Why I&apos;m Asking
            </Label>
            <p className="text-xs text-muted-foreground italic bg-muted/20 rounded-lg p-2">
              {question.reason}
            </p>
          </div>
        )}

        {/* Options Section (if provided) */}
        {hasOptions && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              Choose an Option
            </Label>
            <RadioGroup
              value={selectedOption}
              onValueChange={(value) => {
                setSelectedOption(value);
                setCustomAnswer(''); // Clear custom when selecting option
              }}
              className="space-y-2"
            >
              {question.options!.map((opt, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 bg-card rounded-lg p-3 border border-border hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedOption(opt);
                    setCustomAnswer('');
                  }}
                >
                  <RadioGroupItem value={opt} id={`opt-${index}`} />
                  <Label htmlFor={`opt-${index}`} className="text-sm cursor-pointer flex-1">
                    {opt}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Custom Answer Section */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">
            {hasOptions ? 'Or Provide Custom Answer' : 'Your Answer'}
          </Label>
          <Textarea
            placeholder={
              hasOptions
                ? 'Type a custom response if none of the options fit...'
                : 'Type your answer here...'
            }
            value={customAnswer}
            onChange={(e) => {
              setCustomAnswer(e.target.value);
              setSelectedOption(''); // Clear option when typing custom
            }}
            className="min-h-[100px]"
          />
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Answer & Resume QA
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
