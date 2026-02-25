import { Card, CardBody, CardHeader } from '@nextui-org/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export function ApplicationTrendsChart({ data }) {
  const defaultData = [
    { name: 'Jan', applicants: 40, shortlisted: 24 },
    { name: 'Feb', applicants: 30, shortlisted: 13 },
    { name: 'Mar', applicants: 20, shortlisted: 18 },
    { name: 'Apr', applicants: 27, shortlisted: 29 },
    { name: 'May', applicants: 18, shortlisted: 48 },
    { name: 'Jun', applicants: 23, shortlisted: 38 },
    { name: 'Jul', applicants: 34, shortlisted: 43 },
  ];

  const chartData = data || defaultData;

  return (
    <Card className="h-[400px] w-full border-none shadow-sm">
      <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
        <h4 className="text-lg font-bold text-default-900">Application Trends</h4>
        <p className="text-sm text-default-500">Monthly applicant and shortlisting data</p>
      </CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorApplicants" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#006FEE" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#006FEE" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorShortlisted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#17C964" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#17C964" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717A", fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717A", fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            />
            <Area 
              type="monotone" 
              dataKey="applicants" 
              stroke="#006FEE" 
              fillOpacity={1} 
              fill="url(#colorApplicants)" 
              strokeWidth={3}
            />
            <Area 
              type="monotone" 
              dataKey="shortlisted" 
              stroke="#17C964" 
              fillOpacity={1} 
              fill="url(#colorShortlisted)" 
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}

export default ApplicationTrendsChart;
