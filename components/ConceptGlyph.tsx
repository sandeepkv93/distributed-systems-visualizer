'use client';

interface ConceptGlyphProps {
  id: string;
  className?: string;
}

export default function ConceptGlyph({ id, className = 'w-10 h-10' }: ConceptGlyphProps) {
  const common = {
    viewBox: '0 0 48 48',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className,
    'aria-hidden': true as const,
  };

  switch (id) {
    case 'cap-theorem':
      return (
        <svg {...common}>
          <path d="M24 7L41 37H7L24 7Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M24 7L41 37" stroke="#D9441E" strokeWidth="2.2" />
          <circle cx="24" cy="7" r="3" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="41" cy="37" r="3" fill="#D9441E" />
          <circle cx="7" cy="37" r="3" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="24" cy="27" r="1.5" fill="currentColor" opacity="0.45" />
        </svg>
      );

    case 'lamport-clocks':
      return (
        <svg {...common}>
          <line x1="7" y1="14" x2="41" y2="14" stroke="currentColor" strokeWidth="1.3" opacity="0.4" />
          <line x1="7" y1="24" x2="41" y2="24" stroke="currentColor" strokeWidth="1.3" opacity="0.4" />
          <line x1="7" y1="34" x2="41" y2="34" stroke="currentColor" strokeWidth="1.3" opacity="0.4" />
          <path d="M13 14L23 24L35 34" stroke="#D9441E" strokeWidth="1.75" />
          <circle cx="13" cy="14" r="2.8" fill="currentColor" />
          <circle cx="23" cy="24" r="2.8" fill="#D9441E" />
          <circle cx="35" cy="34" r="2.8" fill="currentColor" />
          <circle cx="32" cy="14" r="2.2" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );

    case 'vector-clocks':
      return (
        <svg {...common}>
          <rect x="8" y="9" width="32" height="30" stroke="currentColor" strokeWidth="1.3" opacity="0.35" />
          <line x1="18.6" y1="9" x2="18.6" y2="39" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
          <line x1="29.3" y1="9" x2="29.3" y2="39" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
          <line x1="8" y1="19" x2="40" y2="19" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
          <line x1="8" y1="29" x2="40" y2="29" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
          <rect x="10.5" y="11.5" width="5.5" height="5" fill="currentColor" />
          <rect x="21.2" y="21.5" width="5.5" height="5" fill="#D9441E" />
          <rect x="31.8" y="21.5" width="5.5" height="5" fill="currentColor" opacity="0.6" />
          <rect x="31.8" y="31.5" width="5.5" height="5" fill="currentColor" />
        </svg>
      );

    case 'chandy-lamport':
      return (
        <svg {...common}>
          <line x1="7" y1="14" x2="41" y2="14" stroke="currentColor" strokeWidth="1.4" />
          <line x1="7" y1="24" x2="41" y2="24" stroke="currentColor" strokeWidth="1.4" />
          <line x1="7" y1="34" x2="41" y2="34" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M27 7C21 15 31 23 23 32C20 35 19 38 19 41"
            stroke="#D9441E"
            strokeWidth="2"
            strokeDasharray="3 2.5"
          />
          <circle cx="24" cy="14" r="2.5" fill="#D9441E" />
          <circle cx="27" cy="24" r="2.5" fill="#D9441E" />
          <circle cx="21" cy="34" r="2.5" fill="#D9441E" />
        </svg>
      );

    case 'eventual-consistency':
      return (
        <svg {...common}>
          <path d="M8 14C16 14 20 24 38 24" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 34C16 34 20 24 38 24" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
          <path d="M8 24H38" stroke="#D9441E" strokeWidth="1.6" strokeDasharray="2.5 2.5" />
          <circle cx="10" cy="14" r="2.5" fill="currentColor" />
          <circle cx="10" cy="34" r="2.5" fill="currentColor" opacity="0.55" />
          <circle cx="38" cy="24" r="3.5" fill="#D9441E" />
        </svg>
      );

    case 'crdts':
      return (
        <svg {...common}>
          <path d="M24 8L37 24L24 40L11 24L24 8Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M24 8V40" stroke="currentColor" strokeWidth="1.1" opacity="0.3" />
          <circle cx="24" cy="8" r="3.2" fill="#D9441E" />
          <circle cx="11" cy="24" r="2.6" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="37" cy="24" r="2.6" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="24" cy="40" r="2.6" fill="currentColor" />
        </svg>
      );

    case 'gossip-anti-entropy':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="15" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2 3" opacity="0.4" />
          <path d="M24 11L35 28L13 28L24 11Z" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
          <path d="M24 11L36 18M24 11L12 18" stroke="#D9441E" strokeWidth="1.7" />
          <circle cx="24" cy="11" r="3.2" fill="#D9441E" />
          <circle cx="36" cy="18" r="2.4" fill="currentColor" />
          <circle cx="12" cy="18" r="2.4" fill="currentColor" />
          <circle cx="35" cy="28" r="2.4" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="13" cy="28" r="2.4" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="24" cy="38" r="2.4" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );

    case 'merkle-anti-entropy':
      return (
        <svg {...common}>
          <path d="M24 11L15 23M24 11L33 23M15 23L10 35M15 23L20 35M33 23L28 35M33 23L38 35" stroke="currentColor" strokeWidth="1.4" />
          <path d="M24 11L33 23L38 35" stroke="#D9441E" strokeWidth="1.9" />
          <rect x="21" y="8" width="6" height="6" fill="#D9441E" />
          <rect x="12.5" y="20.5" width="5" height="5" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.4" />
          <rect x="30.5" y="20.5" width="5" height="5" fill="#D9441E" />
          <circle cx="10" cy="36" r="2.3" fill="currentColor" />
          <circle cx="20" cy="36" r="2.3" fill="currentColor" />
          <circle cx="28" cy="36" r="2.3" fill="currentColor" />
          <circle cx="38" cy="36" r="2.6" fill="#D9441E" />
        </svg>
      );

    case 'quorum-replication':
      return (
        <svg {...common}>
          <circle cx="19" cy="24" r="11" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="29" cy="24" r="11" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M24 14.3A11 11 0 0 1 24 33.7A11 11 0 0 1 24 14.3Z"
            fill="#D9441E"
            fillOpacity="0.24"
            stroke="#D9441E"
            strokeWidth="1.6"
          />
          <circle cx="24" cy="24" r="2.4" fill="#D9441E" />
        </svg>
      );

    case 'replication-log':
      return (
        <svg {...common}>
          <rect x="8" y="13" width="32" height="7" stroke="currentColor" strokeWidth="1.4" />
          <rect x="8" y="28" width="24" height="7" stroke="currentColor" strokeWidth="1.4" opacity="0.65" />
          <line x1="16" y1="13" x2="16" y2="20" stroke="currentColor" strokeWidth="1.2" />
          <line x1="24" y1="13" x2="24" y2="20" stroke="currentColor" strokeWidth="1.2" />
          <line x1="32" y1="13" x2="32" y2="20" stroke="currentColor" strokeWidth="1.2" />
          <line x1="16" y1="28" x2="16" y2="35" stroke="currentColor" strokeWidth="1.2" opacity="0.65" />
          <line x1="24" y1="28" x2="24" y2="35" stroke="currentColor" strokeWidth="1.2" opacity="0.65" />
          <line x1="24" y1="8" x2="24" y2="40" stroke="#D9441E" strokeWidth="1.8" strokeDasharray="2.5 2" />
        </svg>
      );

    case 'failure-detectors':
      return (
        <svg {...common}>
          <path
            d="M6 25H13L17 15L22 33L26 20L30 25H34"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="square"
          />
          <line x1="34" y1="25" x2="42" y2="25" stroke="#D9441E" strokeWidth="1.8" strokeDasharray="2 2" />
          <circle cx="40" cy="25" r="2.6" fill="#D9441E" />
        </svg>
      );

    case 'consistent-hashing':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="14.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M24 9.5A14.5 14.5 0 0 1 38.5 24" stroke="#D9441E" strokeWidth="2.4" />
          <circle cx="24" cy="9.5" r="2.8" fill="#D9441E" />
          <circle cx="38.5" cy="24" r="2.8" fill="currentColor" />
          <circle cx="15.5" cy="35.8" r="2.8" fill="currentColor" />
          <circle cx="11.5" cy="16.5" r="2" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="33" cy="35" r="1.8" fill="#D9441E" />
        </svg>
      );

    case 'sharding-rebalancing':
      return (
        <svg {...common}>
          <rect x="8" y="10" width="12" height="12" stroke="currentColor" strokeWidth="1.4" />
          <rect x="28" y="10" width="12" height="12" stroke="currentColor" strokeWidth="1.4" />
          <rect x="8" y="26" width="12" height="12" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
          <rect x="28" y="26" width="12" height="12" stroke="#D9441E" strokeWidth="1.7" fill="#D9441E" fillOpacity="0.14" />
          <path d="M20 16H27M24.5 13.5L27 16L24.5 18.5" stroke="#D9441E" strokeWidth="1.6" />
        </svg>
      );

    case 'load-balancing':
      return (
        <svg {...common}>
          <circle cx="10" cy="24" r="3.2" fill="#D9441E" />
          <path d="M13.5 24L35 12M13.5 24H35M13.5 24L35 36" stroke="currentColor" strokeWidth="1.4" />
          <path d="M13.5 24H35" stroke="#D9441E" strokeWidth="1.8" />
          <rect x="35" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1.4" />
          <rect x="35" y="21" width="6" height="6" fill="#D9441E" />
          <rect x="35" y="33" width="6" height="6" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );

    case 'distributed-locking':
      return (
        <svg {...common}>
          <path d="M17 21V15.5A7 7 0 0 1 31 15.5V21" stroke="currentColor" strokeWidth="1.6" />
          <rect x="13" y="21" width="22" height="16" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="24" cy="28" r="2.5" fill="#D9441E" />
          <line x1="24" y1="30.5" x2="24" y2="33.5" stroke="#D9441E" strokeWidth="1.8" />
          <path d="M9 12A17 17 0 0 1 13 8.5" stroke="#D9441E" strokeWidth="1.4" />
        </svg>
      );

    case 'two-phase-commit':
      return (
        <svg {...common}>
          <rect x="19" y="8" width="10" height="7" fill="#D9441E" />
          <path d="M24 15V22M24 22L12 34M24 22V34M24 22L36 34" stroke="currentColor" strokeWidth="1.4" />
          <line x1="10" y1="22" x2="38" y2="22" stroke="#D9441E" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
          <circle cx="12" cy="36" r="3" stroke="currentColor" strokeWidth="1.5" fill="#F4F0E8" />
          <circle cx="24" cy="36" r="3" stroke="currentColor" strokeWidth="1.5" fill="#F4F0E8" />
          <circle cx="36" cy="36" r="3" stroke="currentColor" strokeWidth="1.5" fill="#F4F0E8" />
        </svg>
      );

    case 'distributed-transactions':
      return (
        <svg {...common}>
          <circle cx="11" cy="20" r="3.2" fill="currentColor" />
          <circle cx="24" cy="20" r="3.2" fill="currentColor" />
          <circle cx="37" cy="20" r="3.2" fill="#D9441E" />
          <path d="M14.5 20H20.5M27.5 20H33.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M35 25C31 32 17 32 13 25" stroke="#D9441E" strokeWidth="1.6" strokeDasharray="3 2" />
          <path d="M11.5 28L12.8 24.5L16.2 25.8" stroke="#D9441E" strokeWidth="1.5" />
        </svg>
      );

    case 'network-partitions':
      return (
        <svg {...common}>
          <circle cx="13" cy="17" r="3" fill="currentColor" />
          <circle cx="13" cy="31" r="3" fill="currentColor" />
          <line x1="13" y1="20" x2="13" y2="28" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="35" cy="14" r="3" fill="currentColor" />
          <circle cx="35" cy="24" r="3" fill="#D9441E" />
          <circle cx="35" cy="34" r="3" fill="currentColor" />
          <line x1="35" y1="17" x2="35" y2="31" stroke="currentColor" strokeWidth="1.4" />
          <path d="M25 8L22 18L26 24L22 32L25 40" stroke="#D9441E" strokeWidth="1.9" />
        </svg>
      );

    case 'paxos':
      return (
        <svg {...common}>
          <circle cx="10" cy="16" r="2.8" fill="#D9441E" />
          <circle cx="10" cy="32" r="2.8" stroke="currentColor" strokeWidth="1.5" />
          <rect x="21" y="10" width="6" height="6" stroke="currentColor" strokeWidth="1.4" />
          <rect x="21" y="21" width="6" height="6" stroke="currentColor" strokeWidth="1.4" />
          <rect x="21" y="32" width="6" height="6" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="38" cy="24" r="3.2" fill="currentColor" />
          <path d="M13 16L21 13M13 16L21 24M27 13L35 23M27 24H35" stroke="#D9441E" strokeWidth="1.35" />
          <path d="M13 32L21 35M27 35L35 25" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
        </svg>
      );

    case 'raft':
      return (
        <svg {...common}>
          <path d="M24 12L11 22M24 12L37 22M24 12L15 36M24 12L33 36" stroke="currentColor" strokeWidth="1.35" opacity="0.55" />
          <path d="M24 12L37 22M24 12L33 36" stroke="#D9441E" strokeWidth="1.7" />
          <circle cx="24" cy="12" r="4" fill="#D9441E" />
          <circle cx="11" cy="22" r="2.7" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="37" cy="22" r="2.7" fill="currentColor" />
          <circle cx="15" cy="36" r="2.7" fill="#F4F0E8" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="33" cy="36" r="2.7" fill="currentColor" />
        </svg>
      );

    case 'consensus-variants':
      return (
        <svg {...common}>
          <circle cx="15" cy="16" r="2.6" fill="currentColor" />
          <circle cx="33" cy="16" r="2.6" fill="#D9441E" />
          <circle cx="15" cy="32" r="2.6" fill="currentColor" />
          <circle cx="33" cy="32" r="2.6" fill="currentColor" />
          <path d="M15 16H33V32H15V16Z" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
          <path d="M15 32L33 16" stroke="#D9441E" strokeWidth="1.9" />
          <path d="M15 16L33 32" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2.5" opacity="0.55" />
        </svg>
      );

    case 'pbft':
      return (
        <svg {...common}>
          <path
            d="M14 14H34V34H14V14ZM14 14L34 34M34 14L14 34"
            stroke="currentColor"
            strokeWidth="1.25"
            opacity="0.55"
          />
          <circle cx="14" cy="14" r="3" fill="currentColor" />
          <circle cx="34" cy="14" r="3" fill="currentColor" />
          <circle cx="14" cy="34" r="3" fill="currentColor" />
          <path d="M31 31L37 37M37 31L31 37" stroke="#D9441E" strokeWidth="2.1" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="3" fill="#D9441E" />
        </svg>
      );
  }
}
