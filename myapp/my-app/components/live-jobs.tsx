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

  if (error) return <div>Failed to load jobs</div>;
  if (!jobsData) return <div>Loading...</div>;

  const jobs = Array.isArray(jobsData) ? jobsData : jobsData.results;

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div key={job.job_id} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium">Job #{job.job_id}</span>
              <Badge variant="secondary">{job.status_display}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{job.service_category_display} assigned to {job.artisans_involved.join(', ')}</p>
          </div>
          <div className="text-right">
            <p className="font-medium">${job.total_cost}</p>
            <p className="text-xs text-muted-foreground">Expected</p>
          </div>
        </div>
      ))}
    </div>
  );
}
