"use client"

import useSWR from 'swr';
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const fullUrl = `${(baseUrl || '').endsWith('/') ? baseUrl : `${baseUrl}/`}${url}`;
  return fetch(fullUrl).then(res => res.json());
};

interface Job {
  job_id: string;
  service_category_display: string;
  status_display: string;
  total_cost: string;
  artisans_involved: string[];
}

export default function LiveJobs() {
  const { data: jobsData, error } = useSWR<{ results: Job[] }>('jobs/', fetcher);

  if (error) return <div className="p-8 text-center text-red-500 font-bold">Failed to load jobs</div>;
  if (!jobsData) return <div className="p-8 text-center text-muted-foreground font-medium">Loading production feed...</div>;

  const jobs = Array.isArray(jobsData) ? jobsData : jobsData.results;

  return (
    <div className="divide-y divide-gray-100">
      {jobs.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground font-medium">No active jobs in the feed</div>
      ) : (
        jobs.slice(0, 5).map((job) => (
          <div key={job.job_id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors group">
            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-blue-600">#{job.job_id}</span>
                <Badge 
                  variant="secondary" 
                  className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100 font-bold text-[10px] uppercase"
                >
                  {job.status_display}
                </Badge>
              </div>
              <p className="text-sm font-bold text-gray-900">{job.service_category_display}</p>
              <p className="text-xs text-muted-foreground font-medium">
                Assigned to: <span className="text-gray-600">{job.artisans_involved.join(', ')}</span>
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-extrabold text-gray-900">Ksh {Number(job.total_cost || 0).toLocaleString()}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Expected</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
