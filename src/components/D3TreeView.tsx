import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Family, FamilyMember } from '@/lib/types'

interface D3TreeViewProps {
  family: Family
  onEditMember: (memberId: string) => void
}

interface TreeNode {
  id: string
  name: string
  relationship: string
  photo?: string
  member: FamilyMember
  children?: TreeNode[]
}

export function D3TreeView({ family, onEditMember }: D3TreeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const buildTreeData = (): TreeNode | null => {
    if (!family.headMemberId || !family.members[family.headMemberId]) {
      return null
    }

    const buildNode = (memberId: string): TreeNode => {
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
        children: children.length > 0 ? children : undefined
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

    const margin = { top: 40, right: 120, bottom: 40, left: 120 }
    const width = 1200 - margin.left - margin.right
    const height = 800 - margin.bottom - margin.top

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)

    const container = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Create tree layout
    const tree = d3.tree<TreeNode>()
      .size([height, width])

    const root = d3.hierarchy(treeData)
    const treeNodes = tree(root)

    // Add links
    const links = container.selectAll('.link')
      .data(treeNodes.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<any, any>()
        .x(d => d.y)
        .y(d => d.x))
      .style('fill', 'none')
      .style('stroke', 'oklch(0.82 0.04 75)')
      .style('stroke-width', '2px')
      .style('stroke-opacity', 0.6)

    // Add nodes
    const nodes = container.selectAll('.node')
      .data(treeNodes.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        onEditMember(d.data.id)
      })

    // Add node backgrounds (cards)
    nodes.append('rect')
      .attr('x', -80)
      .attr('y', -40)
      .attr('width', 160)
      .attr('height', 80)
      .attr('rx', 10)
      .style('fill', 'oklch(1 0 0)')
      .style('stroke', 'oklch(0.82 0.04 75)')
      .style('stroke-width', '1px')
      .style('filter', 'drop-shadow(0 4px 6px oklch(0 0 0 / 0.1))')

    // Add member photos or initials
    nodes.each(function(d) {
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
    })

    // Add member names
    nodes.append('text')
      .attr('x', -20)
      .attr('y', -15)
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', 'oklch(0.25 0.02 45)')
      .text(d => d.data.name)

    // Add relationships
    nodes.append('text')
      .attr('x', -20)
      .attr('y', 0)
      .style('font-size', '10px')
      .style('fill', 'oklch(0.45 0.02 45)')
      .text(d => d.data.relationship)

    // Add social profile indicators
    nodes.each(function(d) {
      if (d.data.member.socialProfiles.length > 0) {
        d3.select(this)
          .append('circle')
          .attr('cx', 60)
          .attr('cy', -25)
          .attr('r', 8)
          .style('fill', 'oklch(0.55 0.12 195)')
          
        d3.select(this)
          .append('text')
          .attr('x', 60)
          .attr('y', -21)
          .style('text-anchor', 'middle')
          .style('font-size', '8px')
          .style('font-weight', '600')
          .style('fill', 'white')
          .text(d.data.member.socialProfiles.length.toString())
      }
    })

    // Add crown for family head
    nodes.filter(d => d.data.id === family.headMemberId)
      .append('text')
      .attr('x', 60)
      .attr('y', 5)
      .style('font-size', '16px')
      .text('👑')

    // Add hover effects
    nodes
      .on('mouseenter', function() {
        d3.select(this).select('rect')
          .transition()
          .duration(200)
          .style('stroke-width', '2px')
          .style('stroke', 'oklch(0.65 0.15 45)')
      })
      .on('mouseleave', function() {
        d3.select(this).select('rect')
          .transition()
          .duration(200)
          .style('stroke-width', '1px')
          .style('stroke', 'oklch(0.82 0.04 75)')
      })

  }, [family, onEditMember])

  const familyMembers = Object.values(family.members)

  if (familyMembers.length <= 1) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
          Family Tree
        </h2>
        <div className="overflow-auto bg-card rounded-lg border p-4">
          <svg ref={svgRef} className="w-full"></svg>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-accent rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-accent-foreground">3</span>
            </div>
            <span>Social profiles</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">👑</span>
            <span>Family head</span>
          </div>
        </div>
      </div>
    </div>
  )
}