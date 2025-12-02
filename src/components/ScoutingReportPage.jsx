import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

const d1Teams = [
  // ACC
  'Duke', 'North Carolina', 'Virginia', 'Clemson', 'Miami', 'NC State', 'Virginia Tech',
  'Florida State', 'Georgia Tech', 'Louisville', 'Notre Dame', 'Pittsburgh', 'Syracuse',
  'Wake Forest', 'Boston College', 'California', 'SMU', 'Stanford',
  // Big Ten
  'Michigan', 'Michigan State', 'Ohio State', 'Indiana', 'Purdue', 'Illinois', 'Iowa',
  'Wisconsin', 'Maryland', 'Minnesota', 'Nebraska', 'Northwestern', 'Penn State',
  'Rutgers', 'UCLA', 'USC', 'Oregon', 'Washington',
  // Big 12
  'Kansas', 'Baylor', 'Texas Tech', 'Iowa State', 'Oklahoma State', 'TCU', 'West Virginia',
  'Kansas State', 'BYU', 'Cincinnati', 'Houston', 'UCF', 'Arizona', 'Arizona State', 'Colorado', 'Utah',
  // SEC
  'Kentucky', 'Tennessee', 'Auburn', 'Alabama', 'Arkansas', 'Florida', 'LSU',
  'Mississippi State', 'Missouri', 'Ole Miss', 'South Carolina', 'Texas A&M', 'Vanderbilt',
  'Georgia', 'Oklahoma', 'Texas',
  // Big East
  'UConn', 'Villanova', 'Creighton', 'Marquette', 'Xavier', 'Providence', 'Butler',
  'Seton Hall', 'St. John\'s', 'DePaul', 'Georgetown',
  // Other Major Programs
  'Gonzaga', 'Saint Mary\'s', 'San Diego State', 'Memphis', 'Wichita State', 'VCU',
  'Dayton', 'Davidson', 'Rhode Island', 'Saint Louis', 'Colorado State', 'Nevada',
  'New Mexico', 'UNLV', 'Boise State', 'San Francisco', 'Santa Clara'
].sort();

export default function ScoutingReport() {
  const [yourTeam, setYourTeam] = useState('');
  const [opponent, setOpponent] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateReport = async () => {
    if (!yourTeam || !opponent) {
      setError('Please select both teams');
      return;
    }
    
    if (!apiKey) {
      setError('Please enter your OpenAI API key');
      return;
    }

    if (yourTeam === opponent) {
      setError('Please select different teams');
      return;
    }

    setLoading(true);
    setError('');
    setReport('');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{
            role: 'user',
            content: `Create a detailed scouting report for a college basketball game where ${yourTeam} will play against ${opponent}. Include:

1. Team Overview: Brief history and current season outlook for both teams
2. Key Players: Star players to watch on each team with their strengths
3. Playing Style: Offensive and defensive strategies for each team
4. Matchup Analysis: Key matchups and advantages/disadvantages
5. Keys to Victory: What ${yourTeam} needs to do to win
6. Predicted Outcome: Score prediction with reasoning

Format it professionally as a coach's scouting report.`
          }],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate report');
      }

      const data = await response.json();
      setReport(data.choices[0].message.content);
    } catch (err) {
      setError(err.message || 'Failed to generate scouting report. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-800">Basketball Scouting Report</h1>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Your API key is only used for this session and never stored
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Team
                </label>
                <select
                  value={yourTeam}
                  onChange={(e) => setYourTeam(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select your team</option>
                  {d1Teams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opponent
                </label>
                <select
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select opponent</option>
                  {d1Teams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={generateReport}
              disabled={loading || !yourTeam || !opponent || !apiKey}
              className="w-full bg-gradient-to-r from-orange-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-orange-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Report...
                </>
              ) : (
                'Generate Scouting Report'
              )}
            </button>
          </div>
        </div>

        {report && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {yourTeam} vs {opponent}
            </h2>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {report}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
