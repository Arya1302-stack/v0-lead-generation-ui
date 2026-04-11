"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, Search, RotateCcw, Building2, MapPin, Target } from "lucide-react"

type UIState = "input" | "processing" | "results"

interface FormData {
  keyword: string
  city: string
  radius: string
}

interface Lead {
  companyName: string
  phoneNumber: string
  email: string
  picName: string
  website: string
}

const mockLeads: Lead[] = [
  {
    companyName: "TechVentures Inc.",
    phoneNumber: "+1 (555) 234-5678",
    email: "contact@techventures.com",
    picName: "Sarah Mitchell",
    website: "techventures.com",
  },
  {
    companyName: "DataFlow Solutions",
    phoneNumber: "+1 (555) 345-6789",
    email: "info@dataflow.io",
    picName: "Michael Chen",
    website: "dataflow.io",
  },
  {
    companyName: "CloudNine Systems",
    phoneNumber: "+1 (555) 456-7890",
    email: "hello@cloudnine.dev",
    picName: "Emily Rodriguez",
    website: "cloudnine.dev",
  },
  {
    companyName: "InnovateTech Labs",
    phoneNumber: "+1 (555) 567-8901",
    email: "business@innovatetech.co",
    picName: "James Wilson",
    website: "innovatetech.co",
  },
  {
    companyName: "NextGen Digital",
    phoneNumber: "+1 (555) 678-9012",
    email: "sales@nextgendigital.com",
    picName: "Amanda Foster",
    website: "nextgendigital.com",
  },
]

export function LeadScraper() {
  const [uiState, setUIState] = useState<UIState>("input")
  const [progress, setProgress] = useState(0)
  const [formData, setFormData] = useState<FormData>({
    keyword: "",
    city: "",
    radius: "",
  })

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleStartScraping = (e: React.FormEvent) => {
    e.preventDefault()
    setUIState("processing")
    setProgress(0)
  }

  useEffect(() => {
    if (uiState === "processing") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setUIState("results")
            return 100
          }
          return prev + Math.random() * 15 + 5
        })
      }, 300)

      return () => clearInterval(interval)
    }
  }, [uiState])

  const handleNewRequest = () => {
    setUIState("input")
    setProgress(0)
    setFormData({ keyword: "", city: "", radius: "" })
  }

  const handleDownloadCSV = useCallback(() => {
    const headers = ["Company Name", "Phone Number", "Email", "PIC Name", "Website"]
    const csvContent = [
      headers.join(","),
      ...mockLeads.map((lead) =>
        [lead.companyName, lead.phoneNumber, lead.email, lead.picName, lead.website].join(",")
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `leads-${formData.keyword || "data"}-${formData.city || "all"}.csv`
    link.click()
  }, [formData.keyword, formData.city])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Target className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">LeadScrape</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Docs
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 md:py-16">
        {/* Input State */}
        {uiState === "input" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-8 max-w-lg">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-balance mb-3">
                Find Your Next Leads
              </h1>
              <p className="text-muted-foreground text-pretty">
                Enter your search criteria to discover qualified business leads in your target market.
              </p>
            </div>
            <Card className="w-full max-w-md shadow-lg border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Search Parameters</CardTitle>
                <CardDescription>
                  Define your target industry and location to find relevant leads.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStartScraping}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel className="text-sm font-medium">
                        <Building2 className="size-4 text-muted-foreground" />
                        Keyword / Industry
                      </FieldLabel>
                      <Input
                        type="text"
                        placeholder="e.g., Software, Restaurant, Marketing"
                        value={formData.keyword}
                        onChange={(e) => handleInputChange("keyword", e.target.value)}
                        required
                        className="h-10"
                      />
                    </Field>
                    <Field>
                      <FieldLabel className="text-sm font-medium">
                        <MapPin className="size-4 text-muted-foreground" />
                        City / Location
                      </FieldLabel>
                      <Input
                        type="text"
                        placeholder="e.g., New York, San Francisco"
                        value={formData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        required
                        className="h-10"
                      />
                    </Field>
                    <Field>
                      <FieldLabel className="text-sm font-medium">
                        <Target className="size-4 text-muted-foreground" />
                        Radius in KM
                      </FieldLabel>
                      <Input
                        type="number"
                        placeholder="e.g., 25"
                        min={1}
                        max={500}
                        value={formData.radius}
                        onChange={(e) => handleInputChange("radius", e.target.value)}
                        required
                        className="h-10"
                      />
                    </Field>
                  </FieldGroup>
                  <Button type="submit" className="w-full mt-6 h-11" size="lg">
                    <Search className="size-4" />
                    Start Scraping
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Processing State */}
        {uiState === "processing" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md shadow-lg border-border/50">
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col items-center text-center">
                  <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Search className="size-7 text-primary animate-pulse" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Scraping in Progress</h2>
                  <p className="text-muted-foreground text-sm mb-6">
                    Finding leads for{" "}
                    <span className="font-medium text-foreground">{formData.keyword}</span> in{" "}
                    <span className="font-medium text-foreground">{formData.city}</span>
                  </p>
                  <div className="w-full space-y-2">
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {Math.min(Math.round(progress), 100)}% complete
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Please wait while we gather the data...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results State */}
        {uiState === "results" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Results</h1>
                <p className="text-muted-foreground mt-1">
                  Found <span className="font-semibold text-foreground">{mockLeads.length}</span>{" "}
                  leads for{" "}
                  <span className="font-medium text-foreground">{formData.keyword}</span> in{" "}
                  <span className="font-medium text-foreground">{formData.city}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleDownloadCSV}>
                  <Download className="size-4" />
                  Download CSV
                </Button>
                <Button onClick={handleNewRequest}>
                  <RotateCcw className="size-4" />
                  New Request
                </Button>
              </div>
            </div>

            <Card className="shadow-lg border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Company Name</TableHead>
                    <TableHead className="font-semibold">Phone Number</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">PIC Name</TableHead>
                    <TableHead className="font-semibold">Website</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockLeads.map((lead, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{lead.companyName}</TableCell>
                      <TableCell>{lead.phoneNumber}</TableCell>
                      <TableCell>
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-primary hover:underline"
                        >
                          {lead.email}
                        </a>
                      </TableCell>
                      <TableCell>{lead.picName}</TableCell>
                      <TableCell>
                        <a
                          href={`https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {lead.website}
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="flex justify-center pt-4">
              <p className="text-sm text-muted-foreground">
                Tip: Use the Download CSV button to export your leads for further analysis.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/30 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 LeadScrape. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
