import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../UI/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import { Button } from '../UI/Button';
import { FaPlus, FaPiggyBank, FaHandHoldingUsd, FaCreditCard, FaChartLine } from 'react-icons/fa';
import { SavingsLoansTab } from '../../types/savingsLoans';
import SavingsLoansDashboard from './SavingsLoansDashboard';
import MemberSavingsTab from './MemberSavingsTab';
import LoansFromMembersTab from './LoansFromMembersTab';
import LoansToMembersTab from './LoansToMembersTab';

const SavingsLoansPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SavingsLoansTab>('dashboard');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Simpanan &amp; Pinjaman
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Kelola simpanan anggota dan transaksi pinjaman
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SavingsLoansTab)}>
            <div className="border-b border-gray-200 dark:border-gray-700">
              <TabsList className="grid w-full grid-cols-4 bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="dashboard" 
                  className="flex items-center gap-2 py-4 px-6 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none"
                >
                  <FaChartLine className="w-4 h-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger 
                  value="savings" 
                  className="flex items-center gap-2 py-4 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                >
                  <FaPiggyBank className="w-4 h-4" />
                  Simpanan Anggota
                </TabsTrigger>
                <TabsTrigger 
                  value="loans-from" 
                  className="flex items-center gap-2 py-4 px-6 data-[state=active]:bg-green-50 data-[state=active]:text-green-600 data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none"
                >
                  <FaHandHoldingUsd className="w-4 h-4" />
                  Pinjaman dari Anggota
                </TabsTrigger>
                <TabsTrigger 
                  value="loans-to" 
                  className="flex items-center gap-2 py-4 px-6 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 rounded-none"
                >
                  <FaCreditCard className="w-4 h-4" />
                  Pinjaman ke Anggota
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard" className="p-6 space-y-4">
              <SavingsLoansDashboard />
            </TabsContent>

            <TabsContent value="savings" className="p-6 space-y-4">
              <MemberSavingsTab />
            </TabsContent>

            <TabsContent value="loans-from" className="p-6 space-y-4">
              <LoansFromMembersTab />
            </TabsContent>

            <TabsContent value="loans-to" className="p-6 space-y-4">
              <LoansToMembersTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SavingsLoansPage;