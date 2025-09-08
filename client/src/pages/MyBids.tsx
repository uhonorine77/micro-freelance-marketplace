// client/src/pages/MyBids.tsx
import React from 'react';
import { useQuery } from 'react-query';
import { bidsApi } from '../services/api';
import { BidWithFreelancer, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Loader2 } from 'lucide-react';

const BidStatusBadge = ({ status }: { status: string }) => (
  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
    status === 'accepted' ? 'bg-green-100 text-green-800' :
    status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800'
  }`}>
    {status}
  </span>
);

const MyBids: React.FC = () => {
  const { user } = useAuth();
  const { data: myBids, isLoading } = useQuery(
    'myBids',
    () => bidsApi.getMyBids().then((res) => res.data.data || []),
    { enabled: user?.role === UserRole.freelancer }
  );

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">My Bids</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {myBids && myBids.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {myBids.map((bid: BidWithFreelancer) => (
              <li key={bid.id} className="py-4">
                <Link to={`/task/${bid.taskId}`} className="block hover:bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-700">{(bid.task as any).title}</h3>
                      <p className="text-sm text-gray-600 font-bold mt-1">${bid.amount} - {bid.timeline}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Submitted on {format(new Date(bid.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <BidStatusBadge status={bid.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-300" />
            <h3 className="mt-2 text-lg font-medium text-gray-800">You haven't placed any bids</h3>
            <p className="mt-1 text-sm text-gray-500">
              <Link to="/tasks/browse" className="text-indigo-600 hover:underline">Browse projects</Link> to find your next opportunity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBids;