import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Family, FamilyMember } from '@/lib/types'

interface CollapsibleTreeViewProps {
  family: Family
  onEditMember: (memberId: string) => void
  onSelectMember: (memberId: string) => void
}

interface TreeNode extends d3.HierarchyNode<any> {
  id: string
  name: string
  relationship: string
  photo?: string
  member: FamilyMember
  children?: TreeNode[]
  _children?: TreeNode[]
  x?: number
  y?: number
  x0?: number
  y0?: number
}

export function CollapsibleTreeView({ family, onEditMember, onSelectMember }: CollapsibleTreeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const buildTreeData = (): any | null => {
    if (!family.headMemberId || !family.members[family.headMemberId]) {
      return null
    }

    const buildNode = (memberId: string): any => {
      const member = family.members[memberId]
      const children = member.children
        .map(childId => family.members[childId])
        .filter(Boolean)
        .map(child => buildNode(child.id))

      return {
        id: member.id,
        name: member.name,
        relationship: member.relationship,
        photo: member.photo,
        member,
        children: children.length > 0 ? children : null
      }
    }

    return buildNode(family.headMemberId)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  useEffect(() => {
    if (!svgRef.current) return

    const treeData = buildTreeData()
    if (!treeData) return

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove()

    const margin = { top: 20, right: 120, bottom: 20, left: 120 }
    const width = dimensions.width - margin.right - margin.left
    const height = dimensions.height - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })

    svg.call(zoom)

    const tree = d3.tree<any>().size([height, width])
    const root = d3.hierarchy(treeData)
    
    root.x0 = height / 2
    root.y0 = 0

    // Collapse after the first level
    if (root.children) {
      root.children.forEach(collapse)
    }

    update(root)

    function collapse(d: any) {
      if (d.children) {
        d._children = d.children
        d._children.forEach(collapse)
        d.children = null
      }
    }

    function update(source: any) {
      const treeData = tree(root)
      const nodes = treeData.descendants()
      const links = treeData.descendants().slice(1)

      // Normalize for fixed-depth
      nodes.forEach((d: any) => {
        d.y = d.depth * 200
      })

      // Update the nodes
      const node = g.selectAll('g.node')
        .data(nodes, (d: any) => d.id || (d.id = ++i))

      // Enter any new nodes at the parent's previous position
      const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", () => `translate(${source.y0},${source.x0})`)
        .style('cursor', 'pointer')
        .on('click', click)

      // Add node backgrounds (cards)
      nodeEnter.append('rect')
        .attr('x', -80)
        .attr('y', -40)
        .attr('width', 160)
        .attr('height', 80)
        .attr('rx', 8)
        .style('fill', 'oklch(1 0 0)')
        .style('stroke', 'oklch(0.82 0.04 75)')
        .style('stroke-width', '1px')
        .style('filter', 'drop-shadow(0 2px 4px oklch(0 0 0 / 0.1))')

      // Add member photos or initials
      nodeEnter.each(function(d: any) {
        const node = d3.select(this)
        
        if (d.data.photo) {
          // Add photo
          node.append('image')
            .attr('x', -60)
            .attr('y', -25)
            .attr('width', 30)
            .attr('height', 30)
            .attr('href', d.data.photo)
            .style('clip-path', 'circle(15px)')
        } else {
          // Add initials circle
          node.append('circle')
            .attr('cx', -45)
            .attr('cy', -10)
            .attr('r', 15)
            .style('fill', 'oklch(0.65 0.15 45)')
            
          node.append('text')
            .attr('x', -45)
            .attr('y', -6)
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('font-weight', '600')
            .style('fill', 'white')
            .text(getInitials(d.data.name))
        }

        // Add crown for family head
        if (d.data.id === family.headMemberId) {
          node.append('text')
            .attr('x', 60)
            .attr('y', -20)
            .style('font-size', '16px')
            .text('👑')
        }

        // Add collapse indicator
        if (d._children) {
          node.append('circle')
            .attr('cx', 60)
            .attr('cy', 20)
            .attr('r', 8)
            .style('fill', 'oklch(0.55 0.12 195)')
            
          node.append('text')
            .attr('x', 60)
            .attr('y', 24)
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('font-weight', '600')
            .style('fill', 'white')
            .text('+')
        }
      })

      // Add member names
      nodeEnter.append('text')
        .attr('x', -15)
        .attr('y', -15)
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'oklch(0.25 0.02 45)')
        .text((d: any) => d.data.name.length > 12 ? d.data.name.substring(0, 12) + '...' : d.data.name)

      // Add relationships
      nodeEnter.append('text')
        .attr('x', -15)
        .attr('y', 0)
        .style('font-size', '10px')
        .style('fill', 'oklch(0.45 0.02 45)')
        .text((d: any) => d.data.relationship)

      // Add context menu button
      nodeEnter.append('circle')
        .attr('cx', -60)
        .attr('cy', 20)
        .attr('r', 8)
        .style('fill', 'oklch(0.88 0.03 75)')
        .style('stroke', 'oklch(0.82 0.04 75)')
        .style('cursor', 'pointer')
        .on('click', function(event: any, d: any) {
          event.stopPropagation()
          onEditMember(d.data.id)
        })

      nodeEnter.append('text')
        .attr('x', -60)
        .attr('y', 24)
        .style('text-anchor', 'middle')
        .style('font-size', '8px')
        .style('font-weight', '600')
        .style('fill', 'oklch(0.45 0.02 45)')
        .style('cursor', 'pointer')
        .text('⋯')
        .on('click', function(event: any, d: any) {
          event.stopPropagation()
          onEditMember(d.data.id)
        })

      // Transition nodes to their new position
      const nodeUpdate = nodeEnter.merge(node as any)

      nodeUpdate.transition()
        .duration(750)
        .attr("transform", (d: any) => `translate(${d.y},${d.x})`)

      // Update the node attributes and style
      nodeUpdate.select('rect')
        .style('fill', 'oklch(1 0 0)')

      // Remove any exiting nodes
      const nodeExit = node.exit().transition()
        .duration(750)
        .attr("transform", () => `translate(${source.y},${source.x})`)
        .remove()

      nodeExit.select('rect')
        .style('opacity', 0)

      // Update the links
      const link = g.selectAll('path.link')
        .data(links, (d: any) => d.id)

      // Enter any new links at the parent's previous position
      const linkEnter = link.enter().insert('path', "g")
        .attr("class", "link")
        .attr('d', () => {
          const o = {x: source.x0, y: source.y0}
          return diagonal(o, o)
        })
        .style('fill', 'none')
        .style('stroke', 'oklch(0.82 0.04 75)')
        .style('stroke-width', '2px')

      // Transition links to their new position
      linkEnter.merge(link as any).transition()
        .duration(750)
        .attr('d', (d: any) => diagonal(d, d.parent))

      // Remove any exiting links
      link.exit().transition()
        .duration(750)
        .attr('d', () => {
          const o = {x: source.x, y: source.y}
          return diagonal(o, o)
        })
        .remove()

      // Store the old positions for transition
      nodes.forEach((d: any) => {
        d.x0 = d.x
        d.y0 = d.y
      })
    }

    function click(event: any, d: any) {
      if (d.children) {
        d._children = d.children
        d.children = null
      } else {
        d.children = d._children
        d._children = null
      }
      
      // Also trigger the select callback for focusing
      onSelectMember(d.data.id)
      
      update(d)
    }

    function diagonal(s: any, d: any) {
      return `M ${s.y} ${s.x}
              C ${(s.y + d.y) / 2} ${s.x},
                ${(s.y + d.y) / 2} ${d.x},
                ${d.y} ${d.x}`
    }

    let i = 0

  }, [family, onEditMember, onSelectMember, dimensions])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(600, container.clientHeight)
        })
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const familyMembers = Object.values(family.members)

  if (familyMembers.length <= 1) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
          Interactive Family Tree
        </h2>
        <div className="overflow-auto bg-card rounded-lg border" style={{ height: '600px' }}>
          <svg ref={svgRef} className="w-full h-full"></svg>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-accent rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-accent-foreground">+</span>
            </div>
            <span>Click to expand/collapse</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">👑</span>
            <span>Family head</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">⋯</span>
            <span>Edit menu</span>
          </div>
        </div>
      </div>
    </div>
  )
}