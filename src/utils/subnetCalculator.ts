// No UI imports here

export interface Subnet {
    id: string;
    name?: string;
    cidr: string;
    networkAddress: string;
    subnetMask: string;
    maskBits: number;
    hostAddressRange: string;
    usableHostIpRange: string;
    totalHosts: number;
    usableHosts: number;
    firstUsableIp: string;
    lastUsableIp: string;
    broadcastAddress: string;
    sortKey: number; // IP as number for sorting
  }
  
  export interface JoinInfo { // Still potentially useful for direct joins
      child1Id: string;
      child2Id: string;
      parentId: string;
  }
  
  // --- Validation ---
  export function validateIpAddress(ip: string): boolean {
      if (typeof ip !== 'string') return false;
      // Standard IPv4 Regex: Matches 4 blocks of 0-255 separated by dots.
      // Handles single '0' correctly, prevents leading zeros like '01'.
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;
      if (!ipv4Regex.test(ip)) {
          return false;
      }
      // Additionally check parts individually to be absolutely sure about leading zeros if regex isn't perfect
      // const parts = ip.split('.');
      // return parts.every(part => (part === '0' || !part.startsWith('0') || part.length === 1));
      // The regex above should be sufficient
      return true;
  }
  
  export function validateMaskBits(bits: number): boolean {
      return typeof bits === 'number' && Number.isInteger(bits) && bits >= 0 && bits <= 32;
  }
  
  // --- Core IP ---
  export function ipToNumber(ip: string): number {
    // Return 0 ONLY if validation strictly fails.
    if (!validateIpAddress(ip)) {
        console.error(`ipToNumber received invalid IP: ${ip}`);
        // Throwing an error might be better, but returning 0 will cause 0.0.0.0
        return 0;
    }
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }
  
  export function numberToIp(num: number): string {
      const validNum = num >>> 0; // Ensure treated as unsigned 32-bit
      return `${(validNum >>> 24)}.${(validNum >> 16) & 255}.${(validNum >> 8) & 255}.${validNum & 255}`;
  }
  
  // --- Subnet Logic ---
  export function calculateSubnetMask(maskBits: number): string {
      if (!validateMaskBits(maskBits)) return "INVALID_MASK";
      if (maskBits === 0) return "0.0.0.0";
      const mask = (0xFFFFFFFF << (32 - maskBits)) >>> 0;
      return numberToIp(mask);
  }
  
  export function getNetworkAddress(ipOrNetworkNum: string | number, maskBits: number): string {
      if (!validateMaskBits(maskBits)) return "INVALID_INPUT";
  
      let ipNum: number;
      if (typeof ipOrNetworkNum === 'string') {
          if (!validateIpAddress(ipOrNetworkNum)) {
               console.error(`getNetworkAddress received invalid IP string: ${ipOrNetworkNum}`);
               return "INVALID_INPUT";
          }
          ipNum = ipToNumber(ipOrNetworkNum);
           // Handle the 0.0.0.0 case explicitly if ipToNumber might return 0 on error
           if (ipNum === 0 && ipOrNetworkNum !== "0.0.0.0") {
                console.error(`ipToNumber returned 0 for non-"0.0.0.0" IP: ${ipOrNetworkNum}`);
               return "INVALID_INPUT";
           }
  
      } else if (typeof ipOrNetworkNum === 'number') {
          ipNum = ipOrNetworkNum >>> 0; // Ensure unsigned 32-bit
      } else {
          console.error(`getNetworkAddress received invalid type: ${typeof ipOrNetworkNum}`);
          return "INVALID_INPUT";
      }
  
      if (maskBits === 0) return "0.0.0.0";
      const mask = (0xFFFFFFFF << (32 - maskBits)) >>> 0;
      return numberToIp(ipNum & mask);
  }
  
  export function getBroadcastAddress(networkAddrNum: number, maskBits: number): string {
      if (isNaN(networkAddrNum) || !validateMaskBits(maskBits)) return "INVALID_INPUT";
      if (maskBits === 32) return numberToIp(networkAddrNum);
      if (maskBits === 0) return "255.255.255.255";
      const wildcardMask = ~( (0xFFFFFFFF << (32 - maskBits)) >>> 0 ) >>> 0;
      return numberToIp((networkAddrNum | wildcardMask) >>> 0);
  }
  
  export function calculateSubnetDetails(cleanNetworkAddr: string, maskBits: number): Subnet | null {
       if (cleanNetworkAddr === "INVALID_INPUT" || !validateMaskBits(maskBits)) {
           console.error(`calculateSubnetDetails called with invalid args: ${cleanNetworkAddr}, ${maskBits}`);
           return null;
       }
       // Trust cleanNetworkAddr is valid IF it's not the error string
       if (!validateIpAddress(cleanNetworkAddr)){
           console.error(`calculateSubnetDetails received non-IP or error string: ${cleanNetworkAddr}`);
           return null; // Fail explicitly
       }
  
      const networkAddrNum = ipToNumber(cleanNetworkAddr);
      const subnetMaskStr = calculateSubnetMask(maskBits);
      const totalHosts = Math.pow(2, 32 - maskBits);
      const broadcastAddrStr = getBroadcastAddress(networkAddrNum, maskBits);
      const firstIpNum = networkAddrNum;
      const lastIpNum = ipToNumber(broadcastAddrStr); // Calculate based on string
  
      let usableHosts = 0;
      let firstUsableIpStr = "N/A";
      let lastUsableIpStr = "N/A";
      let usableHostIpRangeStr = "N/A";
  
      if (maskBits === 32) { usableHosts = 1; firstUsableIpStr = cleanNetworkAddr; lastUsableIpStr = cleanNetworkAddr; usableHostIpRangeStr = cleanNetworkAddr; }
      else if (maskBits === 31) { usableHosts = 2; firstUsableIpStr = cleanNetworkAddr; lastUsableIpStr = broadcastAddrStr; usableHostIpRangeStr = `${firstUsableIpStr} - ${lastUsableIpStr}`; }
      else if (maskBits < 31 && totalHosts >= 2) { usableHosts = totalHosts - 2; firstUsableIpStr = numberToIp(firstIpNum + 1); lastUsableIpStr = numberToIp(lastIpNum - 1); usableHostIpRangeStr = `${firstUsableIpStr} - ${lastUsableIpStr}`; }
  
      const hostAddressRangeStr = `${cleanNetworkAddr} - ${broadcastAddrStr}`;
  
      return {
          id: `${cleanNetworkAddr}/${maskBits}-${Math.random().toString(36).substring(2, 9)}`,
          cidr: `${cleanNetworkAddr}/${maskBits}`,
          networkAddress: cleanNetworkAddr, subnetMask: subnetMaskStr, maskBits,
          hostAddressRange: hostAddressRangeStr, usableHostIpRange: usableHostIpRangeStr,
          totalHosts, usableHosts, firstUsableIp: firstUsableIpStr, lastUsableIp: lastUsableIpStr,
          broadcastAddress: broadcastAddrStr, sortKey: networkAddrNum,
      };
  }
  
  // --- Control Functions ---
  export function calculateInitialSubnet(baseIp: string, maskBits: number): Subnet[] {
      const networkAddress = getNetworkAddress(baseIp, maskBits); // Derive correct network address first
      if (networkAddress === "INVALID_INPUT") return []; // Handle error from getNetworkAddress
      const subnet = calculateSubnetDetails(networkAddress, maskBits);
      return subnet ? [subnet] : [];
  }
  
  export function divideSubnet(subnet: Subnet): Subnet[] {
      if (!subnet || subnet.maskBits >= 32) return [];
      const newMaskBits = subnet.maskBits + 1;
      const networkAddrNum = subnet.sortKey; // Use the stored number
      const newSubnetSize = Math.pow(2, 32 - newMaskBits);
      const subnet1Addr = subnet.networkAddress; // First keeps original addr
      const subnet2Addr = numberToIp((networkAddrNum + newSubnetSize) >>> 0);
  
      const sub1 = calculateSubnetDetails(subnet1Addr, newMaskBits);
      const sub2 = calculateSubnetDetails(subnet2Addr, newMaskBits);
      return [sub1, sub2].filter(Boolean) as Subnet[]; // Filter out nulls
  }
  
  export function canJoinSubnets(subnet1: Subnet, subnet2: Subnet): boolean {
      if (!subnet1 || !subnet2 || subnet1.maskBits !== subnet2.maskBits || subnet1.maskBits <= 0 || subnet1.maskBits > 31) return false; // Can't join /0 or /32 effectively
      const parentMaskBits = subnet1.maskBits - 1;
      const parentNet1 = getNetworkAddress(subnet1.networkAddress, parentMaskBits);
      const parentNet2 = getNetworkAddress(subnet2.networkAddress, parentMaskBits);
      return parentNet1 !== "INVALID_INPUT" && parentNet1 === parentNet2;
  }
  
  export function joinSubnets(subnet1: Subnet, subnet2: Subnet): Subnet | null {
      if (!canJoinSubnets(subnet1, subnet2)) return null;
      const parentMask = subnet1.maskBits - 1;
      const parentAddr = numberToIp(Math.min(subnet1.sortKey, subnet2.sortKey)); // Lower numerical address is parent
      return calculateSubnetDetails(parentAddr, parentMask);
  }
  
  // --- Helpers ---
  export function sortSubnets(subnets: Subnet[]): Subnet[] {
      // Sort primarily by network address (numeric), then by mask length (larger networks first)
      return subnets.sort((a, b) => a.sortKey - b.sortKey || a.maskBits - b.maskBits);
  }
  
  // findJoinablePairs - Keep as is, still useful for identifying immediate pairs even if not directly rendered
  export function findJoinablePairs(subnets: Subnet[]): JoinInfo[] {
      // (Implementation from previous step is fine)
      const joinable: JoinInfo[] = [];
      const processed = new Set<string>();
      for (let i = 0; i < subnets.length; i++) {
          const s1 = subnets[i];
          if (processed.has(s1.id) || s1.maskBits === 0 || s1.maskBits === 32) continue;
          for (let j = i + 1; j < subnets.length; j++) {
              const s2 = subnets[j];
              if (processed.has(s2.id)) continue;
              if (s1.maskBits === s2.maskBits && canJoinSubnets(s1, s2)) {
                   const parentMask = s1.maskBits - 1;
                   const parentNetwork = numberToIp(Math.min(s1.sortKey, s2.sortKey));
                   joinable.push({ child1Id: s1.id, child2Id: s2.id, parentId: `${parentNetwork}/${parentMask}` });
                   processed.add(s1.id);
                   processed.add(s2.id);
                   break; // Found pair for s1
              }
          }
      }
      return joinable;
  }