import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { FiDownload, FiRefreshCw, FiSettings, FiInfo } from 'react-icons/fi';
import {
    calculateInitialSubnet,
    validateIpAddress,
    validateMaskBits,
    divideSubnet,
    joinSubnets,
    Subnet,
    sortSubnets,
    // findJoinablePairs is no longer needed for rendering, but joinSubnets still useful
    JoinInfo, // May not be needed anymore
    getNetworkAddress
} from '../utils/subnetCalculator';
import SubnetTable from './SubnetTable';
import { useTheme } from '../context/ThemeContext';

// Interfaces (no change)
interface NetworkInput { address: string; maskBits: string; }
interface DisplayOptions { showSubnetName: boolean; showNetmask: boolean; showRange: boolean; showUsableIps: boolean; showHosts: boolean; showDivide: boolean; showJoin: boolean; }
interface ValidationErrors { address?: string; maskBits?: string; }
type ColumnWidths = { name: number; cidr: number; netmask: number; range: number; usable: number; hosts: number; divide: number; };

const SubnetCalculator = memo(() => {
    const { isDarkMode } = useTheme();
    const [network, setNetwork] = useState<NetworkInput>({ address: '192.168.0.0', maskBits: '16' });
    const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({ showSubnetName: true, showNetmask: true, showRange: true, showUsableIps: true, showHosts: true, showDivide: true, showJoin: true });
    const [subnets, setSubnets] = useState<Subnet[]>([]);
    // joinablePairs is likely not needed for the hierarchical view rendering
    // const [joinablePairs, setJoinablePairs] = useState<JoinInfo[]>([]);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [originalMask, setOriginalMask] = useState<number | null>(null); // Keep track of the starting mask
    const [columnWidths, setColumnWidths] = useState<ColumnWidths>({ name: 140, cidr: 160, netmask: 140, range: 240, usable: 240, hosts: 90, divide: 70 });

    // Find joinable pairs logic might be removed if not used elsewhere
    // useEffect(() => {
    //     setJoinablePairs(findJoinablePairs(subnets));
    // }, [subnets]);

    const validateInputs = useCallback((): boolean => {
        const newErrors: ValidationErrors = {};
        const maskBitsNum = parseInt(network.maskBits, 10);
        if (!validateIpAddress(network.address)) {
            newErrors.address = 'Invalid IP address format (e.g., 192.168.0.0)';
        }
        if (isNaN(maskBitsNum) || !validateMaskBits(maskBitsNum)) {
            newErrors.maskBits = 'Mask must be an integer 0-32';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [network.address, network.maskBits]);

    const handleCalculate = useCallback(() => {
        if (!validateInputs()) return;
        const maskBitsNum = parseInt(network.maskBits, 10);
        const networkAddress = getNetworkAddress(network.address, maskBitsNum);
        const results = calculateInitialSubnet(networkAddress, maskBitsNum);
        setSubnets(sortSubnets(results));
        setOriginalMask(maskBitsNum); // Store the initial mask
        setErrors({});
    }, [network.address, network.maskBits, validateInputs]);

    const handleReset = useCallback(() => {
        setNetwork({ address: '192.168.0.0', maskBits: '16' });
        setDisplayOptions({ showSubnetName: true, showNetmask: true, showRange: true, showUsableIps: true, showHosts: true, showDivide: true, showJoin: true });
        setSubnets([]);
        // setJoinablePairs([]); // Not needed if removing simple join buttons
        setErrors({});
        setColumnWidths({ name: 140, cidr: 160, netmask: 140, range: 240, usable: 240, hosts: 90, divide: 70 });
        setOriginalMask(null); // Reset original mask
    }, []);

    const handleDivide = useCallback((subnetId: string) => {
        setSubnets(prevSubnets => {
            const subnetIndex = prevSubnets.findIndex(s => s.id === subnetId);
            if (subnetIndex === -1) return prevSubnets;
            const subnetToDivide = prevSubnets[subnetIndex];
            if (!subnetToDivide || subnetToDivide.maskBits >= 32) return prevSubnets;
            const newSubnets = divideSubnet(subnetToDivide);
            if (newSubnets.length === 2) {
                 const updatedSubnets = [...prevSubnets.slice(0, subnetIndex), ...newSubnets, ...prevSubnets.slice(subnetIndex + 1)];
                 return sortSubnets(updatedSubnets);
             }
            return prevSubnets;
        });
    }, []);

    // *** UPDATED onJoin: Accepts specific IDs determined by SubnetTable ***
    const handleJoin = useCallback((subnetId1: string, subnetId2: string) => {
        setSubnets(prevSubnets => {
            const subnet1 = prevSubnets.find(s => s.id === subnetId1);
            const subnet2 = prevSubnets.find(s => s.id === subnetId2);

            // Basic check if subnets exist (should always be true if called correctly)
            if (!subnet1 || !subnet2) {
                console.error("One or both subnets not found for joining:", subnetId1, subnetId2);
                return prevSubnets;
            }

            // Attempt to join using the utility function
            const joinedSubnet = joinSubnets(subnet1, subnet2);

            if (joinedSubnet) {
                const updatedSubnets = prevSubnets
                    .filter(s => s.id !== subnetId1 && s.id !== subnetId2) // Remove children
                    .concat(joinedSubnet); // Add parent
                return sortSubnets(updatedSubnets);
            }

            // Log if join failed (e.g., utility function returned null)
            console.error("Join operation failed in utility function for:", subnet1.cidr, subnet2.cidr);
            return prevSubnets; // Return previous state if join fails
        });
    }, []); // No dependency on originalMask needed here anymore

    const handleUpdateName = useCallback((id: string, newName: string) => {
        setSubnets(prevSubnets => prevSubnets.map(subnet => subnet.id === id ? { ...subnet, name: newName } : subnet));
    }, []);

    const handleResize = useCallback((columnId: keyof ColumnWidths) =>
        (e: React.SyntheticEvent, { size }: { size: { width: number } }) => {
            setColumnWidths(prev => ({ ...prev, [columnId]: Math.max(60, size.width) }));
    }, []);

    const exportData = useCallback((format: 'csv' | 'json') => {
        // (Keep export logic as is from previous versions)
        if (subnets.length === 0) { alert("No subnet data to export."); return; }
        const headersMap: { [K in keyof DisplayOptions]?: string } = { showSubnetName: 'Subnet Name', showNetmask: 'Netmask', showRange: 'Range', showUsableIps: 'Useable IPs', showHosts: 'Hosts' };
        const baseHeaders = ['Subnet Address', 'Network Address', 'Broadcast Address', 'First Usable IP', 'Last Usable IP', 'Total Hosts'];
        const visibleHeaders = [ ...(displayOptions.showSubnetName ? [headersMap.showSubnetName] : []), baseHeaders[0], ...(displayOptions.showNetmask ? [headersMap.showNetmask] : []), ...(displayOptions.showRange ? [headersMap.showRange] : []), ...(displayOptions.showUsableIps ? [headersMap.showUsableIps] : []), ...(displayOptions.showHosts ? [headersMap.showHosts] : []), ...baseHeaders.slice(1) ].filter(Boolean) as string[];
        const dataToExport = subnets.map(subnet => ({ 'Subnet Name': subnet.name || '', 'Subnet Address': subnet.cidr, 'Netmask': subnet.subnetMask, 'Range': subnet.hostAddressRange, 'Useable IPs': subnet.usableHostIpRange, 'Hosts': subnet.usableHosts, 'Network Address': subnet.networkAddress, 'Broadcast Address': subnet.broadcastAddress, 'First Usable IP': subnet.firstUsableIp, 'Last Usable IP': subnet.lastUsableIp, 'Total Hosts': subnet.totalHosts, }));
        let dataString: string, filename: string, type: string;
        if (format === 'csv') {
            const headerRow = visibleHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
            const rows = dataToExport.map(row => visibleHeaders.map(header => { const key = header as keyof typeof row; const value = row[key] ?? ''; const stringValue = String(value); return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue; }).join(','));
            dataString = [headerRow, ...rows].join('\n'); filename = 'cidr-flow-subnets.csv'; type = 'text/csv;charset=utf-8;';
        } else {
            const filteredData = dataToExport.map(row => { const filteredRow: Record<string, any> = {}; visibleHeaders.forEach(header => { const key = header as keyof typeof row; if (Object.prototype.hasOwnProperty.call(row, key)) { filteredRow[header] = row[key]; } }); return filteredRow; });
            dataString = JSON.stringify(filteredData, null, 2); filename = 'cidr-flow-subnets.json'; type = 'application/json;charset=utf-8;';
        }
        const blob = new Blob([dataString], { type }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    }, [subnets, displayOptions]);

    // --- Styling Classes (Keep memoized versions) ---
    const cardClass = useMemo(() => `rounded-md p-6 ${isDarkMode ? 'bg-dark-secondary border border-dark-border shadow-md-dark' : 'bg-white border border-gray-200 shadow-md'}`, [isDarkMode]);
    const inputClass = useMemo(() => `config-input px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 text-sm ${isDarkMode ? 'bg-dark-primary border-dark-border text-dark-text_primary placeholder-gray-500 focus:border-dark-accent_blue focus:ring-dark-accent_blue' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:ring-blue-600'}`, [isDarkMode]);
    const errorInputClass = 'border-red-500 focus:ring-red-500 focus:border-red-500';
    const checkboxClass = useMemo(() => `config-checkbox h-4 w-4 rounded shadow-sm border-gray-300 dark:border-dark-border focus:ring-dark-accent_blue ${isDarkMode ? 'bg-dark-primary text-dark-accent_blue' : 'text-blue-600'}`, [isDarkMode]);
    const labelClass = "block text-sm font-medium mb-1";
    const primaryButtonClass = useMemo(() => `px-4 py-2 rounded-md shadow-sm text-sm font-medium flex items-center justify-center transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-secondary bg-dark-accent_blue text-white hover:bg-opacity-80 focus:ring-dark-accent_blue`, []);
    const secondaryButtonClass = useMemo(() => `px-4 py-2 rounded-md shadow-sm text-sm font-medium flex items-center justify-center transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-secondary ${isDarkMode ? 'bg-dark-tertiary text-dark-text_secondary hover:bg-opacity-80 focus:ring-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400'}`, [isDarkMode]);

    // --- Render (No change needed) ---
    return (
        <div className="space-y-6 font-sans">
            <div className={cardClass}>
                <h2 className={`text-xl font-montserrat font-semibold mb-5 flex items-center ${isDarkMode ? 'text-dark-text_primary': 'text-gray-800'}`}> <FiSettings className="w-5 h-5 mr-2" /> Network Configuration </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 items-end">
                    <div className="md:col-span-2"> <label htmlFor="networkAddress" className={`${labelClass} ${isDarkMode ? 'text-dark-text_secondary': 'text-gray-700'}`}>Network Address</label> <input id="networkAddress" type="text" value={network.address} onChange={(e) => setNetwork({ ...network, address: e.target.value })} className={`${inputClass} w-full ${errors.address ? errorInputClass : ''}`} placeholder="e.g., 192.168.0.0" aria-invalid={!!errors.address} aria-describedby="address-error" /> {errors.address && <p id="address-error" className="text-red-500 text-xs mt-1">{errors.address}</p>} </div>
                    <div> <label htmlFor="maskBits" className={`${labelClass} ${isDarkMode ? 'text-dark-text_secondary': 'text-gray-700'}`}>Mask Bits</label> <div className="flex items-center"> <span className={`px-2 text-lg ${isDarkMode ? 'text-dark-text_secondary' : 'text-gray-500'}`}>/</span> <input id="maskBits" type="number" value={network.maskBits} onChange={(e) => setNetwork({ ...network, maskBits: e.target.value })} className={`${inputClass} w-full ${errors.maskBits ? errorInputClass : ''}`} min="0" max="32" step="1" placeholder="16" aria-invalid={!!errors.maskBits} aria-describedby="maskbits-error" /> </div> {errors.maskBits && <p id="maskbits-error" className="text-red-500 text-xs mt-1">{errors.maskBits}</p>} </div>
                </div>
                <div className="mb-6">
                    <h3 className={`text-base font-medium mb-2 flex items-center ${isDarkMode ? 'text-dark-text_secondary' : 'text-gray-600'}`}> <FiInfo className="w-4 h-4 mr-2"/> Show Columns: </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-2">
                        {[ { key: 'showSubnetName', label: 'Name' }, { key: 'showNetmask', label: 'Netmask' }, { key: 'showRange', label: 'Range' }, { key: 'showUsableIps', label: 'Usable IPs' }, { key: 'showHosts', label: 'Hosts' }, { key: 'showDivide', label: 'Divide' }, { key: 'showJoin', label: 'Join' }, ].map(opt => ( <label key={opt.key} className="flex items-center space-x-2 cursor-pointer"> <input type="checkbox" checked={displayOptions[opt.key as keyof DisplayOptions]} onChange={(e) => setDisplayOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))} className={checkboxClass}/> <span className={`text-sm select-none ${isDarkMode ? 'text-dark-text_primary' : 'text-gray-700'}`}>{opt.label}</span> </label> ))}
                    </div>
                </div>
                <div className="flex flex-wrap gap-3"> <button onClick={handleCalculate} className={primaryButtonClass}>Update / Calculate</button> <button onClick={handleReset} className={secondaryButtonClass}><FiRefreshCw className="w-4 h-4 mr-2" />Reset</button> <button onClick={() => exportData('csv')} className={secondaryButtonClass} disabled={subnets.length === 0}><FiDownload className="w-4 h-4 mr-2" />Export CSV</button> <button onClick={() => exportData('json')} className={secondaryButtonClass} disabled={subnets.length === 0}><FiDownload className="w-4 h-4 mr-2" />Export JSON</button> </div>
           </div>

           {/* Pass originalMask prop */}
           <SubnetTable
               subnets={subnets}
            //    joinablePairs={joinablePairs} // Not strictly needed for rendering hierarchy
               columnWidths={columnWidths}
               onResize={handleResize}
               showSubnetName={displayOptions.showSubnetName}
               showNetmask={displayOptions.showNetmask}
               showRange={displayOptions.showRange}
               showUsableIps={displayOptions.showUsableIps}
               showHosts={displayOptions.showHosts}
               showDivide={displayOptions.showDivide}
               showJoin={displayOptions.showJoin}
               onDivide={handleDivide}
               onJoin={handleJoin} // Pass the updated callback
               onUpdateName={handleUpdateName}
               originalMask={originalMask} // Pass the original mask down
           />
       </div>
   );
});

export default SubnetCalculator;