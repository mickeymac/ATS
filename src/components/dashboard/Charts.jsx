import { Card, CardBody, CardHeader } from '@nextui-org/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function StatusDistributionChart({ data }) {
  const chartData = data && data.length > 0 ? data : [];

  return (
    <Card className="surface-card h-[400px] w-full border border-divider shadow-sm bg-default-50/20">
      <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
        <h4 className="text-lg font-bold text-default-900">Application Status Distribution</h4>
        <p className="text-sm text-default-500">Breakdown of applications by current status</p>
      </CardHeader>
      <CardBody className="flex items-center justify-center">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--nextui-divider))', background: 'hsl(var(--nextui-content1))' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center text-default-400 italic gap-2">
            <div className="p-4 rounded-full bg-default-100/50">
              <PieChart size={32} className="opacity-20" />
            </div>
            <p className="text-sm">No status data available</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function RecruiterPerformanceChart({ data }) {
  const chartData = data && data.length > 0 ? data : [];

  return (
    <Card className="surface-card h-[400px] w-full border border-divider shadow-sm bg-default-50/20">
      <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
        <h4 className="text-lg font-bold text-default-900">Recruiter Performance</h4>
        <p className="text-sm text-default-500">Applications handled vs. successful hires</p>
      </CardHeader>
      <CardBody className="flex items-center justify-center">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--nextui-divider))" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--nextui-default-500))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--nextui-default-500))', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--nextui-divider))', background: 'hsl(var(--nextui-content1))' }}
              />
              <Legend />
              <Bar dataKey="apps" fill="hsl(var(--nextui-primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hires" fill="hsl(var(--nextui-success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center text-default-400 italic gap-2">
            <div className="p-4 rounded-full bg-default-100/50">
              <BarChart size={32} className="opacity-20" />
            </div>
            <p className="text-sm">No recruiter data available</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function ApplicationTrendsChart({ data }) {
  const chartData = data && data.length > 0 ? data : [];
  const hasData = chartData.some(d => d.applicants > 0 || d.shortlisted > 0);

  return (
    <Card className="surface-card h-[400px] w-full border border-divider shadow-sm bg-default-50/20">
      <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
        <h4 className="text-lg font-bold text-default-900">Application Trends</h4>
        <p className="text-sm text-default-500">Monthly applicant and shortlisting data</p>
      </CardHeader>
      <CardBody className="flex items-center justify-center">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorApplicants" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--nextui-primary))" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="hsl(var(--nextui-primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorShortlisted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--nextui-success))" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="hsl(var(--nextui-success))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--nextui-divider))" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--nextui-default-500))', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--nextui-default-500))', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--nextui-divider))', background: 'hsl(var(--nextui-content1))' }}
              />
              <Area 
                type="monotone" 
                dataKey="applicants" 
                stroke="hsl(var(--nextui-primary))" 
                fillOpacity={1} 
                fill="url(#colorApplicants)" 
                strokeWidth={3}
              />
              <Area 
                type="monotone" 
                dataKey="shortlisted" 
                stroke="hsl(var(--nextui-success))" 
                fillOpacity={1} 
                fill="url(#colorShortlisted)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center text-default-400 italic gap-2">
            <div className="p-4 rounded-full bg-default-100/50">
              <AreaChart size={32} className="opacity-20" />
            </div>
            <p className="text-sm">No trend data available for this period</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default ApplicationTrendsChart;
