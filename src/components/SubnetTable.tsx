import React, { memo, useMemo, useCallback } from 'react';
import { FiDivide } from 'react-icons/fi';
import { Resizable } from 'react-resizable';
import { useTheme } from '../context/ThemeContext';
import { Subnet, getNetworkAddress } from '../utils/subnetCalculator';

interface SubnetTableProps {
    subnets: Subnet[];
    columnWidths: { name: number; cidr: number; netmask: number; range: number; usable: number; hosts: number; divide: number; };
    onResize: (columnId: keyof SubnetTableProps['columnWidths']) => (e: React.SyntheticEvent, data: { size: { width: number } }) => void;
    showSubnetName: boolean; showNetmask: boolean; showRange: boolean; showUsableIps: boolean; showHosts: boolean; showDivide: boolean; showJoin: boolean;
    onDivide: (id: string) => void;
    onJoin: (subnetId1: string, subnetId2: string) => void;
    onUpdateName: (id: string, newName: string) => void;
    originalMask: number | null;
}

// Resizable Header Component (No changes)
const ResizableHeader = memo(({ children, width, onResize, className, title }: { children: React.ReactNode, width: number, onResize: (e: React.SyntheticEvent, data: { size: { width: number } }) => void, className: string, title?: string }) => (
    <th className={`${className} relative p-0 align-middle header-base`} title={title}>
        <Resizable width={width} height={38} onResize={onResize} draggableOpts={{ enableUserSelectHack: false }} axis="x" handle={<span className="th-resize-handle" />} resizeHandles={['e']}>
            <div className="th-content-wrapper" style={{ width: `${width}px` }}>{children}</div>
        </Resizable>
    </th>
));


const SubnetTable = memo(({
    subnets, columnWidths, onResize,
    showSubnetName, showNetmask, showRange, showUsableIps, showHosts, showDivide, showJoin,
    onDivide, onJoin, onUpdateName, originalMask
}: SubnetTableProps) => {
    const { isDarkMode } = useTheme();
    const joinLevelColumnWidth = '3rem'; // Width for each hierarchy level column

    // Determine Join Levels (Descending Order for Visual)
    const joinLevelsDescending = useMemo(() => {
        if (!showJoin || originalMask === null || subnets.length === 0) return [];
        const maxSubnetMask = Math.max(...subnets.map(s => s.maskBits), originalMask);
        const endLevel = Math.min(31, maxSubnetMask); // Don't show /32 joins visually
        const levels: number[] = [];
        for (let level = originalMask; level < endLevel; level++) { // Iterate parent levels /16, /17...
             if (level >= 0) levels.push(level);
        }
        return levels.sort((a, b) => b - a); // Sort DESCENDING (e.g., /18, /17, /16)
    }, [showJoin, originalMask, subnets]);

    // Calculate Row Spans (Map<level, Map<parentNetwork, { firstIndex, count }>>)
    const blockSpans = useMemo(() => {
        const spans = new Map<number, Map<string, { firstIndex: number; count: number }>>();
         if (joinLevelsDescending.length === 0) return spans;

        joinLevelsDescending.forEach(level => { // Use descending levels for consistency, logic inside is fine
            const levelMap = new Map<string, { firstIndex: number; count: number }>();
            let currentBlockNetwork: string | null = null;
            let currentBlockStartIndex = -1;
            let countInBlock = 0;
            subnets.forEach((subnet, index) => {
                 if (subnet.maskBits <= level) { // If subnet is bigger/equal than level, finalize previous
                     if (currentBlockNetwork !== null) { levelMap.set(currentBlockNetwork, { firstIndex: currentBlockStartIndex, count: countInBlock }); }
                     currentBlockNetwork = null; return;
                 }
                 const parentNetwork = getNetworkAddress(subnet.networkAddress, level);
                 if (parentNetwork === "INVALID_INPUT") return;
                 if (parentNetwork !== currentBlockNetwork) {
                    if (currentBlockNetwork !== null) { levelMap.set(currentBlockNetwork, { firstIndex: currentBlockStartIndex, count: countInBlock }); }
                    currentBlockNetwork = parentNetwork; currentBlockStartIndex = index; countInBlock = 1;
                } else { countInBlock++; }
            });
             if (currentBlockNetwork !== null) { levelMap.set(currentBlockNetwork, { firstIndex: currentBlockStartIndex, count: countInBlock }); }
             if (levelMap.size > 0) spans.set(level, levelMap);
        });
        return spans;
    }, [subnets, joinLevelsDescending]); // Depend on descending levels

    // Click Handler
    const handleHierarchicalJoin = useCallback((level: number, parentNetwork: string) => {
        const childMask = level + 1;
        const children = subnets.filter(s => s.maskBits === childMask && getNetworkAddress(s.networkAddress, level) === parentNetwork);
        if (children.length === 2) onJoin(children[0].id, children[1].id);
        else console.warn(`Cannot join /${level} block ${parentNetwork}: Expected 2 children /${childMask}, found ${children.length}.`);
    }, [subnets, onJoin]);

    // Empty/Loading State
     const dataColCount = [showSubnetName, true, showNetmask, showRange, showUsableIps, showHosts, showDivide].filter(Boolean).length;
     const totalColCount = dataColCount + joinLevelsDescending.length;
     if (subnets.length === 0) {
         return ( <div className={`rounded-md shadow-md dark:shadow-md-dark overflow-hidden border dark:border-dark-border mt-6 ${isDarkMode ? 'bg-dark-secondary': 'bg-white'}`}> <table className="subnet-table w-full"> <thead><tr><th colSpan={totalColCount || 1} className={`h-10 border-b dark:border-dark-border p-3 text-sm font-normal ${isDarkMode ? 'text-dark-text_secondary' : 'text-gray-600'}`}>Network</th></tr></thead> <tbody><tr><td colSpan={totalColCount || 1} className={`text-center h-20 ${isDarkMode ? 'text-dark-text_secondary' : 'text-gray-500'}`}> Enter network and click Calculate. </td></tr></tbody> </table> </div> );
     }

    return (
        <div className={`rounded-md shadow-md dark:shadow-md-dark overflow-x-auto overflow-y-hidden border dark:border-dark-border mt-6 ${isDarkMode ? 'bg-dark-secondary' : 'bg-white'}`}>
            <table className="subnet-table">
                <colgroup>
                    {/* Data Columns */}
                    {showSubnetName && <col style={{ width: `${columnWidths.name}px` }} />}
                    <col style={{ width: `${columnWidths.cidr}px` }} />
                    {showNetmask && <col style={{ width: `${columnWidths.netmask}px` }} />}
                    {showRange && <col style={{ width: `${columnWidths.range}px` }} />}
                    {showUsableIps && <col style={{ width: `${columnWidths.usable}px` }} />}
                    {showHosts && <col style={{ width: `${columnWidths.hosts}px` }} />}
                    {showDivide && <col style={{ width: `${columnWidths.divide}px` }} />}
                    {/* Join Hierarchy Columns (Ascending order needed for colgroup) */}
                    {joinLevelsDescending.slice().reverse().map(level => ( <col key={`join-col-${level}`} style={{ width: joinLevelColumnWidth }} /> ))}
                </colgroup>
                <thead>
                     {/* Header Row */}
                    <tr className={isDarkMode ? 'border-b-2 border-dark-border' : 'border-b-2'}>
                        {/* Data Headers */}
                        {showSubnetName && <ResizableHeader width={columnWidths.name} onResize={onResize('name')} className={isDarkMode ? 'dark' : ''} title="Subnet Name">Name</ResizableHeader>}
                        <ResizableHeader width={columnWidths.cidr} onResize={onResize('cidr')} className={isDarkMode ? 'dark' : ''} title="Subnet Address (CIDR)">Address</ResizableHeader>
                        {showNetmask && <ResizableHeader width={columnWidths.netmask} onResize={onResize('netmask')} className={isDarkMode ? 'dark' : ''} title="Subnet Mask">Netmask</ResizableHeader>}
                        {showRange && <ResizableHeader width={columnWidths.range} onResize={onResize('range')} className={isDarkMode ? 'dark' : ''} title="Network & Broadcast Address Range">Range</ResizableHeader>}
                        {showUsableIps && <ResizableHeader width={columnWidths.usable} onResize={onResize('usable')} className={isDarkMode ? 'dark' : ''} title="Usable Host IP Address Range">Usable IPs</ResizableHeader>}
                        {showHosts && <ResizableHeader width={columnWidths.hosts} onResize={onResize('hosts')} className={`text-right justify-end ${isDarkMode ? 'dark' : ''}`} title="Number of Usable Host IPs">Hosts</ResizableHeader>}
                        {showDivide && <ResizableHeader width={columnWidths.divide} onResize={onResize('divide')} className={`text-center justify-center ${isDarkMode ? 'dark' : ''}`} title="Divide Subnet">Divide</ResizableHeader>}
                        {/* Single "Join" Header spanning the hierarchy columns */}
                        {joinLevelsDescending.length > 0 && (
                             <th colSpan={joinLevelsDescending.length} className={`header-base text-center justify-center ${isDarkMode ? 'dark' : ''}`}>Join</th>
                         )}
                    </tr>
                    {/* Optional: Second header row for specific /n levels */}
                    {joinLevelsDescending.length > 0 && (
                        <tr className={isDarkMode ? 'border-b border-dark-border' : 'border-b'}>
                            {/* Empty cells under data headers */}
                            {showSubnetName && <th className='header-sub'></th>}
                            <th className='header-sub'></th>
                            {showNetmask && <th className='header-sub'></th>}
                            {showRange && <th className='header-sub'></th>}
                            {showUsableIps && <th className='header-sub'></th>}
                            {showHosts && <th className='header-sub'></th>}
                            {showDivide && <th className='header-sub'></th>}
                             {/* Individual Join Level Headers - DESCENDING ORDER */}
                            {joinLevelsDescending.map(level => (
                                 <th key={`join-th-${level}`} className={`header-base header-sub text-center justify-center ${isDarkMode ? 'dark' : ''}`} style={{ width: joinLevelColumnWidth }} title={`Join to /${level}`}>
                                    /{level}
                                </th>
                             ))}
                         </tr>
                    )}
                </thead>
                <tbody>
                    {subnets.map((subnet, rowIndex) => {
                        const joinHierarchyCells = joinLevelsDescending.map(level => {
                            let cellContent: React.ReactNode = null;
                            if (level < subnet.maskBits) {
                                const parentNetwork = getNetworkAddress(subnet.networkAddress, level);
                                if (parentNetwork !== "INVALID_INPUT") {
                                    const spanInfo = blockSpans.get(level)?.get(parentNetwork);
                                    if (spanInfo && spanInfo.firstIndex === rowIndex) {
                                         cellContent = ( <td key={`join-${level}-${subnet.id}`} className="cell-join cell-join-placeholder" rowSpan={spanInfo.count} onClick={() => handleHierarchicalJoin(level, parentNetwork)} title={`Join to ${parentNetwork}/${level}`} data-mask-level={`/${level}`}></td> ); // Use data-attr for CSS potentially
                                     } // else: covered by rowspan, render null
                                 } else { cellContent = <td key={`join-err-${level}-${subnet.id}`} className="cell-join cell-join-pad"></td>; }
                             } else { cellContent = <td key={`join-pad-${level}-${subnet.id}`} className="cell-join cell-join-pad"></td>; }
                            return cellContent;
                        });

                        return (
                            <tr key={subnet.id}>
                                {/* Data Cells */}
                                {showSubnetName && <td className="cell-name"><input type="text" value={subnet.name || ''} onChange={(e) => onUpdateName(subnet.id, e.target.value)} className="subnet-name-input" placeholder="-" /></td>}
                                <td title={subnet.cidr}>{subnet.cidr}</td>
                                {showNetmask && <td title={subnet.subnetMask}>{subnet.subnetMask}</td>}
                                {showRange && <td title={subnet.hostAddressRange}>{subnet.hostAddressRange}</td>}
                                {showUsableIps && <td title={subnet.usableHostIpRange}>{subnet.usableHostIpRange}</td>}
                                {showHosts && <td className="cell-hosts" title={subnet.usableHosts.toLocaleString()}>{subnet.usableHosts.toLocaleString()}</td>}
                                {showDivide && <td className="cell-divide"><button onClick={() => onDivide(subnet.id)} className="divide-button" title="Divide subnet" disabled={subnet.maskBits >= 32}><FiDivide className="w-4 h-4" /></button></td>}
                                {/* Join Hierarchy Cells */}
                                {joinHierarchyCells.filter(Boolean)} {/* Filter out nulls */}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
});

export default SubnetTable;