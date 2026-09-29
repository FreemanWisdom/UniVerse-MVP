import { useState } from "react";
import { CampusChatDiscoverStudent, CampusChatSearchStudent } from "@/features/chat/chat.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageRequestDialog } from "@/features/chat/components/message-request-dialog";

interface StudentCardProps {
  student: CampusChatDiscoverStudent | CampusChatSearchStudent;
  isPendingRequest?: boolean;
  onRequestSent?: () => void;
}

export function StudentCard({ student, isPendingRequest, onRequestSent }: StudentCardProps) {
  const isSearchStudent = "reputation_stars" in student;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  return (
    <Card className="flex flex-col h-full bg-surface-100 hover:bg-surface-200 transition-colors border-surface-300">
      <CardContent className="p-4 flex flex-col flex-grow">
        <div className="flex items-start gap-4">
          {/* Avatar Placeholder */}
          <div className="h-12 w-12 rounded-full bg-surface-300 flex-shrink-0 flex items-center justify-center text-sm font-semibold text-slate-300 border border-surface-400">
            {student.full_name.charAt(0).toUpperCase()}
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {student.full_name}
              </h3>

            </div>
            
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {student.department} • {student.level}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {student.university}
            </p>
            
            {isSearchStudent && typeof (student as CampusChatSearchStudent).reputation_stars === "number" && (
              <div className="flex items-center gap-1 mt-1 text-amber-500 text-xs font-medium">
                <svg className="w-3 h-3 fill-current" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {(student as CampusChatSearchStudent).reputation_stars}
              </div>
            )}
          </div>
        </div>

        {student.bio && (
          <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed">
            {student.bio}
          </p>
        )}

        <div className="mt-auto pt-4">
          <Button 
            className="w-full bg-campus-600 hover:bg-campus-700 text-white" 
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            disabled={isPendingRequest}
          >
            {isPendingRequest ? "Request Pending" : "Message"}
          </Button>
          <p className="text-[10px] text-center text-slate-500 mt-2">
            {isPendingRequest ? "They will need to accept before you can chat freely." : "Send a request to connect."}
          </p>
        </div>
      </CardContent>
      
      <MessageRequestDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        recipientId={student.id}
        recipientName={student.full_name}
        onSuccess={onRequestSent}
      />
    </Card>
  );
}
