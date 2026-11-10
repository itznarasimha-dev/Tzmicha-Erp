import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DEMO_CUSTOMERS,
  DEMO_PRODUCTS,
  DEMO_SALES_INVOICES,
  DEMO_ENGINEERS,
  DEMO_EMPLOYEES,
  INITIAL_SERVICE_REQUESTS,
  INITIAL_WORK_ASSIGNMENTS,
  INITIAL_SCHEDULES,
  DEMO_SPARE_PARTS,
  DEMO_SPARE_PART_REQUESTS,
  DEMO_INVENTORY_PROPOSALS,
  DEMO_STOCK_MOVEMENTS,
  DEMO_WARRANTY_AMC,
  DEMO_WARRANTY_RECORDS,
  DEMO_AMC_RECORDS,
  DEMO_SERVICE_BILLING,
  DEMO_SERVICE_HISTORY,
  SERVICE_STORAGE_KEY
} from '../data/initialServiceData';

const ScheduleContext = createContext(null);

export function ScheduleProvider({ children }) {
  // Load unified operations state from localStorage or initial dataset
  const [data, setData] = useState(() => {
    try {
      const stored = localStorage.getItem(SERVICE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed.serviceRequests &&
          parsed.assignments &&
          parsed.schedules &&
          parsed.spareParts &&
          parsed.serviceBilling &&
          parsed.serviceHistory
        ) {
          if (!parsed.sparePartRequests) parsed.sparePartRequests = DEMO_SPARE_PART_REQUESTS;
          if (!parsed.inventoryProposals) parsed.inventoryProposals = DEMO_INVENTORY_PROPOSALS;
          if (!parsed.stockMovements) parsed.stockMovements = DEMO_STOCK_MOVEMENTS;
          if (!parsed.warrantyRecords) parsed.warrantyRecords = DEMO_WARRANTY_RECORDS;
          if (!parsed.amcRecords) parsed.amcRecords = DEMO_AMC_RECORDS;
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return {
      serviceRequests: INITIAL_SERVICE_REQUESTS,
      assignments: INITIAL_WORK_ASSIGNMENTS,
      schedules: INITIAL_SCHEDULES,
      spareParts: DEMO_SPARE_PARTS,
      sparePartRequests: DEMO_SPARE_PART_REQUESTS,
      inventoryProposals: DEMO_INVENTORY_PROPOSALS,
      stockMovements: DEMO_STOCK_MOVEMENTS,
      warrantyRecords: DEMO_WARRANTY_RECORDS,
      amcRecords: DEMO_AMC_RECORDS,
      warrantyAmcRecords: DEMO_WARRANTY_AMC,
      serviceBilling: DEMO_SERVICE_BILLING,
      serviceHistory: DEMO_SERVICE_HISTORY
    };
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SERVICE_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore
    }
  }, [data]);

  const serviceRequests = data.serviceRequests;
  const assignments = data.assignments;
  const schedules = data.schedules;
  const spareParts = data.spareParts;
  const sparePartRequests = data.sparePartRequests || DEMO_SPARE_PART_REQUESTS;
  const inventoryProposals = data.inventoryProposals || DEMO_INVENTORY_PROPOSALS;
  const stockMovements = data.stockMovements || DEMO_STOCK_MOVEMENTS;
  const warrantyRecords = data.warrantyRecords || DEMO_WARRANTY_RECORDS;
  const amcRecords = data.amcRecords || DEMO_AMC_RECORDS;
  const warrantyAmcRecords = data.warrantyRecords || DEMO_WARRANTY_AMC;
  const serviceBilling = data.serviceBilling;
  const serviceHistory = data.serviceHistory;

  /**
   * 1. Add New Service Request
   */
  const addServiceRequest = (reqPayload) => {
    const nextNum = serviceRequests.length + 1;
    const padded = nextNum.toString().padStart(3, '0');
    const newId = `SR-2026-${padded}`;
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);

    const customer = DEMO_CUSTOMERS.find(
      (c) => c.id === reqPayload.customerId || c.code === reqPayload.customerId
    ) || DEMO_CUSTOMERS[0];

    const product = DEMO_PRODUCTS.find(
      (p) => p.id === reqPayload.productId || p.name === reqPayload.productName
    ) || DEMO_PRODUCTS[0];

    const invoice = DEMO_SALES_INVOICES.find(
      (inv) => inv.customerId === customer.id || inv.invoiceNo === reqPayload.invoiceNo
    ) || { invoiceNo: 'INV-2026-090', orderNo: 'SO-2026-042', purchaseDate: '2026-10-18' };

    const newRequest = {
      id: newId,
      customerId: customer.id,
      customerName: customer.name,
      contactPerson: reqPayload.contactPerson || customer.contactPerson,
      contactNumber: reqPayload.contactNumber || customer.phone,
      email: reqPayload.email || customer.email,
      serviceLocation: reqPayload.serviceLocation || customer.address,
      serviceCategory: reqPayload.serviceCategory || 'Breakdown Repair',
      serviceType: reqPayload.serviceType || 'Warranty Service',
      acceptanceStatus: 'New / Awaiting Review',
      isRepeatComplaint: Boolean(reqPayload.isRepeatComplaint),
      previousServiceRequestId: reqPayload.previousServiceRequestId || null,
      repeatValidityDays: reqPayload.repeatValidityDays || 30,
      repeatServiceCovered: reqPayload.repeatServiceCovered !== undefined ? reqPayload.repeatServiceCovered : true,
      productId: product.id,
      productName: reqPayload.productName || product.name,
      serialNumber: reqPayload.serialNumber || `SN-${Date.now().toString().slice(-6)}`,
      invoiceNo: reqPayload.invoiceNo || invoice.invoiceNo,
      orderNo: reqPayload.orderNo || invoice.orderNo,
      purchaseDate: reqPayload.purchaseDate || invoice.purchaseDate,
      warrantyStatus: reqPayload.warrantyStatus || 'Active (Manufacturer 12-Mo)',
      amcStatus: reqPayload.amcStatus || 'Standard AMC',
      issueType: reqPayload.issueType || 'Operational Fault',
      issueDescription: reqPayload.issueDescription || '',
      priority: reqPayload.priority || 'Medium',
      requestDate: reqPayload.requestDate || formattedDate,
      preferredDate: reqPayload.preferredDate || formattedDate,
      assignedEngineerId: null,
      assignedEngineerName: 'Unassigned',
      supportingEmployeeId: null,
      supportingEmployeeName: null,
      status: 'Unassigned', // Natural state: unassigned and ready for assignment
      reportedBy: reqPayload.reportedBy || customer.contactPerson,
      requestSource: reqPayload.requestSource || 'Customer Hotline',
      remarks: reqPayload.remarks || ''
    };

    setData((prev) => ({
      ...prev,
      serviceRequests: [newRequest, ...prev.serviceRequests]
    }));

    return newRequest;
  };

  /**
   * 1B. Service Request Acceptance Workflow (Manager & Coordinator)
   */
  const acceptServiceRequest = (requestId) => {
    setData((prev) => ({
      ...prev,
      serviceRequests: prev.serviceRequests.map((req) =>
        req.id === requestId
          ? { ...req, acceptanceStatus: 'Accepted / Ready for Assignment', status: 'Unassigned' }
          : req
      )
    }));
  };

  const rejectServiceRequest = (requestId, reason = 'Request not eligible under current service policy.') => {
    setData((prev) => ({
      ...prev,
      serviceRequests: prev.serviceRequests.map((req) =>
        req.id === requestId
          ? { ...req, acceptanceStatus: 'Rejected', rejectionReason: reason, status: 'Rejected' }
          : req
      )
    }));
  };

  const acceptAsRepeatComplaint = (requestId, previousSRId) => {
    setData((prev) => ({
      ...prev,
      serviceRequests: prev.serviceRequests.map((req) =>
        req.id === requestId
          ? {
              ...req,
              serviceType: 'Repeat Complaint',
              isRepeatComplaint: true,
              previousServiceRequestId: previousSRId,
              acceptanceStatus: 'Accepted / Ready for Assignment',
              remarks: `${req.remarks ? req.remarks + ' | ' : ''}Accepted as repeat complaint of ${previousSRId}`
            }
          : req
      )
    }));
  };

  /**
   * 2. Update Service Request Status
   */
  const updateServiceRequestStatus = (requestId, newStatus, reason = '') => {
    setData((prev) => ({
      ...prev,
      serviceRequests: prev.serviceRequests.map((req) => {
        if (req.id === requestId) {
          return {
            ...req,
            status: newStatus,
            remarks: reason ? `${req.remarks ? req.remarks + ' | ' : ''}${reason}` : req.remarks
          };
        }
        return req;
      })
    }));
  };

  /**
   * 3. Create Work Assignment (Connects SR to Engineer & Schedule)
   */
  const createWorkAssignment = (assignmentPayload) => {
    const nextAsgNum = (assignments.length + 1).toString().padStart(3, '0');
    const newAsgId = `ASG-2026-${nextAsgNum}`;

    const nextSchNum = 100 + schedules.length + 1;
    const newSchId = `SCH-${nextSchNum}`;

    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);

    const targetSR = serviceRequests.find((s) => s.id === assignmentPayload.serviceRequestId);
    const customerName = targetSR ? targetSR.customerName : assignmentPayload.customerName;
    const customerId = targetSR ? targetSR.customerId : assignmentPayload.customerId;
    const category = targetSR ? targetSR.serviceCategory : assignmentPayload.serviceCategory;
    const product = targetSR ? targetSR.productName : assignmentPayload.productName;
    const location = targetSR ? targetSR.serviceLocation : assignmentPayload.serviceLocation;
    const priority = targetSR ? targetSR.priority : assignmentPayload.priority;

    // Check for scheduling conflict
    const hasConflict = schedules.some(
      (s) =>
        s.assignedEngineerId === assignmentPayload.assignedEngineerId &&
        s.scheduledDate === assignmentPayload.scheduledDate &&
        s.status !== 'Completed' &&
        s.status !== 'Cancelled'
    );

    const newAssignment = {
      id: newAsgId,
      serviceRequestId: assignmentPayload.serviceRequestId,
      customerId,
      customerName,
      serviceCategory: category,
      productName: product,
      issueDescription: targetSR ? targetSR.issueDescription : assignmentPayload.workInstructions,
      priority,
      assignedEngineerId: assignmentPayload.assignedEngineerId,
      assignedEngineerName: assignmentPayload.assignedEngineerName,
      supportingEmployeeId: assignmentPayload.supportingEmployeeId || null,
      supportingEmployeeName: assignmentPayload.supportingEmployeeName || null,
      assignmentDate: assignmentPayload.assignmentDate || formattedDate,
      scheduledDate: assignmentPayload.scheduledDate,
      startTime: assignmentPayload.startTime || '10:00 AM',
      expectedEndTime: assignmentPayload.expectedEndTime || '02:00 PM',
      serviceLocation: location,
      assignmentType: assignmentPayload.assignmentType || 'On-Site Field Visit',
      workInstructions: assignmentPayload.workInstructions || '',
      status: 'Assigned',
      hasConflict,
      conflictNote: hasConflict
        ? `Potential schedule overlap on ${assignmentPayload.scheduledDate} for ${assignmentPayload.assignedEngineerName}`
        : null
    };

    // Corresponding Schedule Record
    const newSchedule = {
      id: newSchId,
      serviceRequestId: assignmentPayload.serviceRequestId,
      customerId,
      customerName,
      customerLocation: location,
      customerContact: targetSR ? `${targetSR.contactPerson} • ${targetSR.contactNumber}` : 'On file',
      assignedEngineerId: assignmentPayload.assignedEngineerId,
      assignedEngineerName: assignmentPayload.assignedEngineerName,
      supportingEmployeeId: assignmentPayload.supportingEmployeeId || null,
      supportingEmployeeName: assignmentPayload.supportingEmployeeName || null,
      serviceCategory: category,
      purpose: targetSR ? targetSR.issueDescription : 'Scheduled field service visit',
      scheduledDate: assignmentPayload.scheduledDate,
      startTime: assignmentPayload.startTime || '10:00 AM',
      expectedEndTime: assignmentPayload.expectedEndTime || '02:00 PM',
      priority,
      status: 'Scheduled',
      progress: 0,
      hasConflict,
      equipmentModel: product,
      reportedIssue: targetSR ? targetSR.issueDescription : 'Service required.'
    };

    setData((prev) => {
      const updatedSRs = prev.serviceRequests.map((sr) => {
        if (sr.id === assignmentPayload.serviceRequestId) {
          return {
            ...sr,
            status: 'Assigned',
            assignedEngineerId: assignmentPayload.assignedEngineerId,
            assignedEngineerName: assignmentPayload.assignedEngineerName,
            supportingEmployeeId: assignmentPayload.supportingEmployeeId || null,
            supportingEmployeeName: assignmentPayload.supportingEmployeeName || null
          };
        }
        return sr;
      });

      return {
        ...prev,
        assignments: [newAssignment, ...prev.assignments],
        schedules: [newSchedule, ...prev.schedules],
        serviceRequests: updatedSRs
      };
    });

    return newAssignment;
  };

  /**
   * 4. Reassign Assignment
   */
  const reassignAssignment = (assignmentId, { newEngineerId, newEngineerName, reason }) => {
    setData((prev) => {
      const targetAsg = prev.assignments.find((a) => a.id === assignmentId);
      if (!targetAsg) return prev;
      const srId = targetAsg.serviceRequestId;

      const updatedAssignments = prev.assignments.map((a) =>
        a.id === assignmentId
          ? { ...a, assignedEngineerId: newEngineerId, assignedEngineerName: newEngineerName }
          : a
      );

      const updatedSchedules = prev.schedules.map((s) =>
        s.serviceRequestId === srId
          ? { ...s, assignedEngineerId: newEngineerId, assignedEngineerName: newEngineerName }
          : s
      );

      const updatedSRs = prev.serviceRequests.map((sr) =>
        sr.id === srId
          ? { ...sr, assignedEngineerId: newEngineerId, assignedEngineerName: newEngineerName }
          : sr
      );

      return {
        ...prev,
        assignments: updatedAssignments,
        schedules: updatedSchedules,
        serviceRequests: updatedSRs
      };
    });
  };

  /**
   * 5. Reschedule Assignment
   */
  const rescheduleAssignment = (assignmentId, { newDate, newStartTime, newEndTime, reason }) => {
    setData((prev) => {
      const targetAsg = prev.assignments.find((a) => a.id === assignmentId);
      if (!targetAsg) return prev;
      const srId = targetAsg.serviceRequestId;

      const updatedAssignments = prev.assignments.map((a) =>
        a.id === assignmentId
          ? { ...a, scheduledDate: newDate, startTime: newStartTime, expectedEndTime: newEndTime, status: 'Rescheduled' }
          : a
      );

      const updatedSchedules = prev.schedules.map((s) =>
        s.serviceRequestId === srId
          ? { ...s, scheduledDate: newDate, startTime: newStartTime, expectedEndTime: newEndTime, status: 'Postponed' }
          : s
      );

      return {
        ...prev,
        assignments: updatedAssignments,
        schedules: updatedSchedules
      };
    });
  };

  /**
   * 6. Cancel Assignment (Rolls SR back to Unassigned)
   */
  const cancelAssignment = (assignmentId, reason) => {
    setData((prev) => {
      const targetAsg = prev.assignments.find((a) => a.id === assignmentId);
      if (!targetAsg) return prev;
      const srId = targetAsg.serviceRequestId;

      const updatedAssignments = prev.assignments.map((a) =>
        a.id === assignmentId ? { ...a, status: 'Cancelled' } : a
      );

      const updatedSchedules = prev.schedules.filter((s) => s.serviceRequestId !== srId);

      const updatedSRs = prev.serviceRequests.map((sr) =>
        sr.id === srId
          ? { ...sr, status: 'Unassigned', assignedEngineerId: null, assignedEngineerName: 'Unassigned' }
          : sr
      );

      return {
        ...prev,
        assignments: updatedAssignments,
        schedules: updatedSchedules,
        serviceRequests: updatedSRs
      };
    });
  };

  /**
   * 7. Record Service Execution (Full diagnostic, labor, parts consumed, completion)
   */
  const recordServiceExecution = (executionPayload) => {
    const {
      serviceRequestId,
      scheduleId,
      diagnosis,
      workPerformed,
      partsUsed = [],
      labourHours = 2,
      serviceStatus = 'Resolved',
      remarks = ''
    } = executionPayload;

    setData((prev) => {
      // 1. Update SR
      const updatedSRs = prev.serviceRequests.map((sr) => {
        if (sr.id === serviceRequestId) {
          return {
            ...sr,
            status: serviceStatus,
            remarks: remarks ? `${sr.remarks ? sr.remarks + ' | ' : ''}${remarks}` : sr.remarks
          };
        }
        return sr;
      });

      // 2. Update Schedule
      const updatedSchedules = prev.schedules.map((sch) => {
        if (sch.id === scheduleId || sch.serviceRequestId === serviceRequestId) {
          return {
            ...sch,
            status: serviceStatus === 'Resolved' || serviceStatus === 'Completed' ? 'Completed' : 'In Progress',
            progress: serviceStatus === 'Resolved' || serviceStatus === 'Completed' ? 100 : 75
          };
        }
        return sch;
      });

      // 3. Update Spare Parts Stock
      let updatedParts = [...prev.spareParts];
      if (partsUsed && partsUsed.length > 0) {
        partsUsed.forEach((pUsed) => {
          updatedParts = updatedParts.map((sp) => {
            if (sp.id === pUsed.partId) {
              const newAvailable = Math.max(0, sp.availableQty - Number(pUsed.quantity || 1));
              const newUsed = sp.usedQty + Number(pUsed.quantity || 1);
              return {
                ...sp,
                availableQty: newAvailable,
                usedQty: newUsed,
                status: newAvailable === 0 ? 'Out of Stock' : newAvailable <= sp.minThreshold ? 'Low Stock' : 'In Stock'
              };
            }
            return sp;
          });
        });
      }

      // 4. Add to Service History if resolved/completed
      let updatedHistory = [...prev.serviceHistory];
      if (serviceStatus === 'Resolved' || serviceStatus === 'Completed') {
        const sr = prev.serviceRequests.find((s) => s.id === serviceRequestId);
        if (sr) {
          const nextHistId = `SH-2026-${(prev.serviceHistory.length + 1).toString().padStart(3, '0')}`;
          const newHistoryRecord = {
            id: nextHistId,
            serviceRequestId: sr.id,
            customerId: sr.customerId,
            customerName: sr.customerName,
            productName: sr.productName,
            issueCategory: sr.serviceCategory,
            assignedEngineerName: sr.assignedEngineerName || 'David Chen',
            serviceDate: new Date().toISOString().slice(0, 10),
            resolutionSummary: workPerformed || diagnosis || 'Service execution verified and completed.',
            status: 'Completed',
            totalDurationHours: Number(labourHours) || 3.0,
            customerRating: 5
          };
          updatedHistory = [newHistoryRecord, ...updatedHistory];
        }
      }

      return {
        ...prev,
        serviceRequests: updatedSRs,
        schedules: updatedSchedules,
        spareParts: updatedParts,
        serviceHistory: updatedHistory
      };
    });
  };

  /**
   * 8. Create Service Billing Invoice
   */
  const createServiceInvoice = (invPayload) => {
    const nextNum = (serviceBilling.length + 1).toString().padStart(3, '0');
    const newInvNo = `SINV-2026-${nextNum}`;
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);

    const subtotal =
      Number(invPayload.serviceCharges || 0) +
      Number(invPayload.labourCharges || 0) +
      Number(invPayload.partsCharges || 0) +
      Number(invPayload.additionalCharges || 0) -
      Number(invPayload.discount || 0);

    const taxRate = 18;
    const taxAmount = (Math.max(0, subtotal) * taxRate) / 100;
    const totalAmount = Math.max(0, subtotal) + taxAmount;

    const newInvoice = {
      serviceInvoiceNo: newInvNo,
      serviceRequestId: invPayload.serviceRequestId,
      customerId: invPayload.customerId,
      customerName: invPayload.customerName,
      salesInvoiceRef: invPayload.salesInvoiceRef || 'INV-2026-090',
      productName: invPayload.productName || 'Industrial Equipment',
      assignedEngineerName: invPayload.assignedEngineerName || 'David Chen',
      invoiceDate: formattedDate,
      dueDate: invPayload.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      paymentTerms: invPayload.paymentTerms || 'Net 30 Days',
      serviceCharges: Number(invPayload.serviceCharges || 0),
      labourCharges: Number(invPayload.labourCharges || 0),
      partsCharges: Number(invPayload.partsCharges || 0),
      additionalCharges: Number(invPayload.additionalCharges || 0),
      discount: Number(invPayload.discount || 0),
      taxRate,
      taxAmount,
      totalAmount,
      amountPaid: Number(invPayload.amountPaid || 0),
      balance: totalAmount - Number(invPayload.amountPaid || 0),
      approvalStatus: invPayload.approvalStatus || 'Pending Finance Approval',
      paymentStatus: Number(invPayload.amountPaid || 0) >= totalAmount ? 'Paid' : 'Unpaid',
      paymentMethod: invPayload.paymentMethod || null,
      paymentDate: Number(invPayload.amountPaid || 0) > 0 ? formattedDate : null,
      notes: invPayload.notes || 'Service invoice generated upon completion.'
    };

    setData((prev) => ({
      ...prev,
      serviceBilling: [newInvoice, ...prev.serviceBilling]
    }));

    return newInvoice;
  };

  /**
   * 8B. Finance Approval Workflow for Service Bills
   */
  const approveServiceBill = (invoiceNo) => {
    setData((prev) => ({
      ...prev,
      serviceBilling: prev.serviceBilling.map((inv) =>
        inv.serviceInvoiceNo === invoiceNo
          ? { ...inv, approvalStatus: 'Approved' }
          : inv
      )
    }));
  };

  const rejectServiceBill = (invoiceNo, reason = 'Invoice charges contested by Finance.') => {
    setData((prev) => ({
      ...prev,
      serviceBilling: prev.serviceBilling.map((inv) =>
        inv.serviceInvoiceNo === invoiceNo
          ? { ...inv, approvalStatus: 'Rejected', rejectionReason: reason }
          : inv
      )
    }));
  };

  const issueServiceBill = (invoiceNo) => {
    setData((prev) => ({
      ...prev,
      serviceBilling: prev.serviceBilling.map((inv) =>
        inv.serviceInvoiceNo === invoiceNo
          ? { ...inv, approvalStatus: 'Issued' }
          : inv
      )
    }));
  };

  /**
   * 9. Record Payment on Service Invoice
   */
  const recordServicePayment = (invoiceNo, { amount, method, referenceNo, paymentDate }) => {
    const pDate = paymentDate || new Date().toISOString().slice(0, 10);
    setData((prev) => ({
      ...prev,
      serviceBilling: prev.serviceBilling.map((inv) => {
        if (inv.serviceInvoiceNo === invoiceNo) {
          const newPaid = Math.min(inv.totalAmount, Number(inv.amountPaid || 0) + Number(amount));
          const newBalance = Math.max(0, inv.totalAmount - newPaid);
          const newStatus = newBalance <= 0 ? 'Paid' : 'Partially Paid';
          return {
            ...inv,
            amountPaid: newPaid,
            balance: newBalance,
            paymentStatus: newStatus,
            paymentMethod: method || inv.paymentMethod || 'Bank Transfer',
            paymentDate: pDate,
            paymentReference: referenceNo || inv.paymentReference
          };
        }
        return inv;
      })
    }));
  };

  /**
   * 10. Update Spare Part Stock & Requisition
   */
  const updateSparePartStock = (partId, { addQty = 0, newBin = null, unitPrice = null }) => {
    setData((prev) => ({
      ...prev,
      spareParts: prev.spareParts.map((part) => {
        if (part.id === partId) {
          const newAvailable = Math.max(0, part.availableQty + Number(addQty));
          const newStatus = newAvailable === 0 ? 'Out of Stock' : newAvailable <= part.minThreshold ? 'Low Stock' : 'In Stock';
          return {
            ...part,
            availableQty: newAvailable,
            status: newStatus,
            location: newBin || part.location,
            unitPrice: unitPrice !== null ? Number(unitPrice) : part.unitPrice
          };
        }
        return part;
      })
    }));
  };

  /**
   * 11. Renew or Update Warranty / AMC Contract
   */
  const renewWarrantyAmc = (recordId, { extensionMonths = 12, newAmcType, additionalVisits = 4 }) => {
    setData((prev) => ({
      ...prev,
      warrantyAmcRecords: prev.warrantyAmcRecords.map((rec) => {
        if (rec.id === recordId) {
          const currentEnd = rec.amcEndDate ? new Date(rec.amcEndDate) : new Date();
          const newEnd = new Date(currentEnd);
          newEnd.setMonth(newEnd.getMonth() + Number(extensionMonths));
          const formattedEnd = newEnd.toISOString().slice(0, 10);

          return {
            ...rec,
            contractStatus: 'Active',
            amcEndDate: formattedEnd,
            amcType: newAmcType || rec.amcType,
            coveredVisitsPerYear: rec.coveredVisitsPerYear + Number(additionalVisits),
            amcContractNo: rec.amcContractNo || `AMC-2026-RNW${Math.floor(100 + Math.random() * 900)}`
          };
        }
        return rec;
      })
    }));
  };

  /**
   * 12. Add New Spare Part
   */
  const addSparePart = (partPayload) => {
    const nextNum = 100 + spareParts.length + 1;
    const newPartId = `SP-${nextNum}`;
    const newPart = {
      id: newPartId,
      name: partPayload.name,
      category: partPayload.category || 'General Components',
      compatibleProductId: partPayload.compatibleProductId || 'PRD-M-101',
      compatibleProductName: partPayload.compatibleProductName || 'General Equipment',
      availableQty: Number(partPayload.availableQty || 0),
      reservedQty: 0,
      usedQty: 0,
      unitPrice: Number(partPayload.unitPrice || 0),
      minThreshold: Number(partPayload.minThreshold || 5),
      status: Number(partPayload.availableQty || 0) === 0 ? 'Out of Stock' : Number(partPayload.availableQty || 0) <= Number(partPayload.minThreshold || 5) ? 'Low Stock' : 'In Stock',
      location: partPayload.location || 'Central Pune Store (Bin A-01)',
      description: partPayload.description || ''
    };

    setData((prev) => ({
      ...prev,
      spareParts: [newPart, ...prev.spareParts]
    }));
    return newPart;
  };

  /**
   * 13. Edit Existing Spare Part
   */
  const editSparePart = (partId, updates) => {
    setData((prev) => ({
      ...prev,
      spareParts: prev.spareParts.map((p) => {
        if (p.id === partId) {
          const avail = updates.availableQty !== undefined ? Number(updates.availableQty) : p.availableQty;
          const minT = updates.minThreshold !== undefined ? Number(updates.minThreshold) : p.minThreshold;
          const status = avail === 0 ? 'Out of Stock' : avail <= minT ? 'Low Stock' : 'In Stock';
          return {
            ...p,
            ...updates,
            availableQty: avail,
            minThreshold: minT,
            status
          };
        }
        return p;
      })
    }));
  };

  /**
   * 14. Add Spare Part Material Request (Two-tier workflow: Manager Approval -> Store Manager Approval)
   */
  const addSparePartRequest = (reqPayload, userRoleId = 'engineer') => {
    const nextNum = (sparePartRequests.length + 1).toString().padStart(3, '0');
    const newReqId = `REQ-SP-${nextNum}`;
    const now = new Date().toISOString().slice(0, 10);

    const isEngOrEmp = userRoleId === 'engineer' || userRoleId === 'employee';
    const initialApprovalStatus = isEngOrEmp ? 'Pending Manager Approval' : 'Pending Store Manager Approval';

    const part = spareParts.find((p) => p.id === reqPayload.partId || p.code === reqPayload.partId);

    const newRequest = {
      id: newReqId,
      serviceRequestId: reqPayload.serviceRequestId,
      customerName: reqPayload.customerName,
      customerId: reqPayload.customerId || 'CUS-000001',
      productName: reqPayload.productName || 'General Equipment',
      partId: reqPayload.partId,
      partCode: reqPayload.partCode || part?.code || reqPayload.partId,
      partName: reqPayload.partName || part?.name || 'Spare Part',
      specification: reqPayload.specification || part?.specification || '',
      uom: reqPayload.uom || part?.uom || 'Pcs',
      requestedQty: Number(reqPayload.requestedQty || 1),
      approvedQty: isEngOrEmp ? 0 : Number(reqPayload.requestedQty || 1),
      collectedQty: 0,
      consumedQty: 0,
      returnedQty: 0,
      fulfilmentMethod: reqPayload.fulfilmentMethod || 'engineer_collect', // 'engineer_collect' or 'store_deliver'
      deliveryAddress: reqPayload.deliveryAddress || reqPayload.serviceLocation || 'Customer Plant Location',
      deliveryStatus: reqPayload.fulfilmentMethod === 'store_deliver' ? 'Pending Approval' : 'Not Applicable',
      dispatchedQty: 0,
      deliveryDate: reqPayload.deliveryDate || null,
      deliveryRemarks: reqPayload.deliveryRemarks || '',
      collectionStatus: reqPayload.fulfilmentMethod === 'engineer_collect' ? 'Pending' : 'Not Applicable',
      collectionDate: null,
      collectionRemarks: '',
      requestedBy: reqPayload.requestedBy || 'Field Service Engineer',
      requiredDate: reqPayload.requiredDate || now,
      requestDate: now,
      approvalStatus: initialApprovalStatus,
      issueStatus: 'Pending',
      reason: reqPayload.reason || 'Required for on-site ticket resolution',
      remarks: reqPayload.remarks || '',
      rejectionReason: null
    };

    setData((prev) => ({
      ...prev,
      sparePartRequests: [newRequest, ...prev.sparePartRequests]
    }));
    return newRequest;
  };

  /**
   * 15. Manager Review Material Request
   */
  const approveSparePartRequest = (requestId) => {
    setData((prev) => ({
      ...prev,
      sparePartRequests: prev.sparePartRequests.map((req) =>
        req.id === requestId
          ? {
              ...req,
              approvalStatus: 'Pending Store Manager Approval',
              approvedQty: req.approvedQty || req.requestedQty,
              deliveryStatus: req.fulfilmentMethod === 'store_deliver' ? 'Preparing for Dispatch' : 'Not Applicable',
              issueStatus: 'Pending Review'
            }
          : req
      )
    }));
  };

  const rejectSparePartRequest = (requestId, reason = 'Request denied by Service Manager.') => {
    setData((prev) => ({
      ...prev,
      sparePartRequests: prev.sparePartRequests.map((req) =>
        req.id === requestId
          ? {
              ...req,
              approvalStatus: 'Rejected',
              issueStatus: 'Cancelled',
              deliveryStatus: req.fulfilmentMethod === 'store_deliver' ? 'Cancelled' : 'Not Applicable',
              rejectionReason: reason
            }
          : req
      )
    }));
  };

  /**
   * 16. Store Manager Material Issue & Stock Auto-Deduction
   */
  const issueSparePart = (requestId) => {
    setData((prev) => {
      const targetReq = prev.sparePartRequests.find((r) => r.id === requestId);
      if (!targetReq) return prev;

      const qty = Number(targetReq.approvedQty || targetReq.requestedQty || 1);
      const now = new Date().toISOString().slice(0, 10);

      const updatedRequests = prev.sparePartRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              approvalStatus: 'Issued',
              issueStatus: 'Issued',
              deliveryStatus: r.fulfilmentMethod === 'store_deliver' ? 'Dispatched' : 'Not Applicable',
              dispatchedQty: r.fulfilmentMethod === 'store_deliver' ? qty : 0,
              deliveryDate: r.fulfilmentMethod === 'store_deliver' ? now : r.deliveryDate
            }
          : r
      );

      const updatedParts = prev.spareParts.map((sp) => {
        if (sp.id === targetReq.partId || sp.code === targetReq.partId) {
          const newAvail = Math.max(0, sp.availableQty - qty);
          const newUsed = sp.usedQty + qty;
          return {
            ...sp,
            availableQty: newAvail,
            usedQty: newUsed,
            status: newAvail === 0 ? 'Out of Stock' : newAvail <= sp.minThreshold ? 'Low Stock' : 'In Stock'
          };
        }
        return sp;
      });

      // Log stock movement
      const nextMvId = `SM-2026-${(prev.stockMovements?.length || 0) + 1}`.padStart(3, '0');
      const movement = {
        id: nextMvId,
        date: now,
        partId: targetReq.partId,
        partName: targetReq.partName,
        specification: targetReq.specification,
        movementType: targetReq.fulfilmentMethod === 'store_deliver' ? 'Store Dispatch (Customer Delivery)' : 'Store Issue (Engineer Collect)',
        quantity: qty,
        serviceRequestId: targetReq.serviceRequestId,
        customerId: targetReq.customerId,
        customerName: targetReq.customerName,
        performedBy: 'Central Store Logistics',
        remarks: `Issued under requisition ${targetReq.id}`
      };

      return {
        ...prev,
        sparePartRequests: updatedRequests,
        spareParts: updatedParts,
        stockMovements: [movement, ...(prev.stockMovements || DEMO_STOCK_MOVEMENTS)]
      };
    });
  };

  /**
   * 16B. Engineer Collects from Store (Collection Checklist)
   */
  const markPartCollected = (requestId, { collectedQty, remarks = '' }) => {
    setData((prev) => {
      const targetReq = prev.sparePartRequests.find((r) => r.id === requestId);
      if (!targetReq) return prev;
      const now = new Date().toISOString().slice(0, 10);
      const qty = Number(collectedQty || targetReq.approvedQty || targetReq.requestedQty || 1);

      const updatedRequests = prev.sparePartRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              collectedQty: qty,
              collectionStatus: 'Collected',
              collectionDate: now,
              collectionRemarks: remarks,
              issueStatus: 'Issued'
            }
          : r
      );

      const updatedParts = prev.spareParts.map((sp) => {
        if (sp.id === targetReq.partId || sp.code === targetReq.partId) {
          const newAvail = Math.max(0, sp.availableQty - qty);
          const newUsed = sp.usedQty + qty;
          return {
            ...sp,
            availableQty: newAvail,
            usedQty: newUsed,
            status: newAvail === 0 ? 'Out of Stock' : newAvail <= sp.minThreshold ? 'Low Stock' : 'In Stock'
          };
        }
        return sp;
      });

      const nextMvId = `SM-2026-${(prev.stockMovements?.length || 0) + 1}`.padStart(3, '0');
      const movement = {
        id: nextMvId,
        date: now,
        partId: targetReq.partId,
        partName: targetReq.partName,
        specification: targetReq.specification,
        movementType: 'Store Issue (Engineer Collect)',
        quantity: qty,
        serviceRequestId: targetReq.serviceRequestId,
        customerId: targetReq.customerId,
        customerName: targetReq.customerName,
        performedBy: targetReq.requestedBy || 'Service Engineer',
        remarks: remarks || `Marked collected by field engineer under ${targetReq.id}`
      };

      return {
        ...prev,
        sparePartRequests: updatedRequests,
        spareParts: updatedParts,
        stockMovements: [movement, ...(prev.stockMovements || DEMO_STOCK_MOVEMENTS)]
      };
    });
  };

  /**
   * 16C. Record Part Consumption on Job & Handle Returns
   */
  const recordPartConsumption = (requestId, { consumedQty, returnedQty = 0, remarks = '' }) => {
    setData((prev) => {
      const targetReq = prev.sparePartRequests.find((r) => r.id === requestId);
      if (!targetReq) return prev;
      const now = new Date().toISOString().slice(0, 10);
      const cQty = Number(consumedQty || 0);
      const rQty = Number(returnedQty || 0);

      const updatedRequests = prev.sparePartRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              consumedQty: cQty,
              returnedQty: rQty,
              remarks: `${r.remarks ? r.remarks + ' | ' : ''}Consumed: ${cQty}, Returned: ${rQty}. ${remarks}`
            }
          : r
      );

      // If returnedQty > 0, return items back to inventory stock!
      let updatedParts = [...prev.spareParts];
      if (rQty > 0) {
        updatedParts = updatedParts.map((sp) => {
          if (sp.id === targetReq.partId || sp.code === targetReq.partId) {
            const newAvail = sp.availableQty + rQty;
            const newUsed = Math.max(0, sp.usedQty - rQty);
            return {
              ...sp,
              availableQty: newAvail,
              usedQty: newUsed,
              status: newAvail === 0 ? 'Out of Stock' : newAvail <= sp.minThreshold ? 'Low Stock' : 'In Stock'
            };
          }
          return sp;
        });
      }

      const nextMvId = `SM-2026-${(prev.stockMovements?.length || 0) + 1}`.padStart(3, '0');
      const movement = {
        id: nextMvId,
        date: now,
        partId: targetReq.partId,
        partName: targetReq.partName,
        specification: targetReq.specification,
        movementType: 'Job Consumption',
        quantity: cQty,
        serviceRequestId: targetReq.serviceRequestId,
        customerId: targetReq.customerId,
        customerName: targetReq.customerName,
        performedBy: targetReq.requestedBy || 'Service Engineer',
        remarks: `Job consumption logged. ${rQty > 0 ? `${rQty} returned to store.` : ''} ${remarks}`
      };

      return {
        ...prev,
        sparePartRequests: updatedRequests,
        spareParts: updatedParts,
        stockMovements: [movement, ...(prev.stockMovements || DEMO_STOCK_MOVEMENTS)]
      };
    });
  };

  /**
   * 16D. Update Delivery Tracking for Direct Store Delivery
   */
  const updateDeliveryStatus = (requestId, { deliveryStatus, dispatchedQty, deliveryDate, remarks = '' }) => {
    setData((prev) => {
      const now = new Date().toISOString().slice(0, 10);
      const updatedRequests = prev.sparePartRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              deliveryStatus,
              dispatchedQty: dispatchedQty !== undefined ? Number(dispatchedQty) : r.dispatchedQty,
              deliveryDate: deliveryDate || r.deliveryDate || now,
              deliveryRemarks: remarks || r.deliveryRemarks,
              issueStatus: deliveryStatus === 'Delivered' ? 'Delivered' : r.issueStatus
            }
          : r
      );
      return {
        ...prev,
        sparePartRequests: updatedRequests
      };
    });
  };

  /**
   * 16E. Direct Company Stock Usage Logging
   */
  const recordDirectStockUsage = ({
    serviceRequestId,
    customerId,
    customerName,
    partId,
    partCode,
    partName,
    specification,
    quantityTaken,
    quantityUsed,
    quantityReturned = 0,
    usageDate,
    remarks = '',
    performedBy = 'Service Engineer'
  }) => {
    const now = usageDate || new Date().toISOString().slice(0, 10);
    const used = Number(quantityUsed || 0);

    setData((prev) => {
      const updatedParts = prev.spareParts.map((sp) => {
        if (sp.id === partId || sp.code === partCode || sp.name === partName) {
          const newAvail = Math.max(0, sp.availableQty - used);
          const newUsed = sp.usedQty + used;
          return {
            ...sp,
            availableQty: newAvail,
            usedQty: newUsed,
            status: newAvail === 0 ? 'Out of Stock' : newAvail <= sp.minThreshold ? 'Low Stock' : 'In Stock'
          };
        }
        return sp;
      });

      const nextMvId = `SM-2026-${(prev.stockMovements?.length || 0) + 1}`.padStart(3, '0');
      const movement = {
        id: nextMvId,
        date: now,
        partId: partId || partCode,
        partName,
        specification: specification || '',
        movementType: 'Direct Company Stock Usage',
        quantity: used,
        serviceRequestId,
        customerId,
        customerName,
        performedBy,
        remarks: `Direct stock usage logged. ${quantityReturned > 0 ? `${quantityReturned} returned.` : ''} ${remarks}`
      };

      return {
        ...prev,
        spareParts: updatedParts,
        stockMovements: [movement, ...(prev.stockMovements || DEMO_STOCK_MOVEMENTS)]
      };
    });
  };

  /**
   * 16F. Inventory Proposals Multi-Tier Approval Workflow
   */
  const proposeInventoryItem = (proposalPayload, userRoleId = 'engineer') => {
    const nextNum = (inventoryProposals.length + 1).toString().padStart(3, '0');
    const newPropId = `PROP-${nextNum}`;
    const now = new Date().toISOString().slice(0, 10);

    const newProposal = {
      id: newPropId,
      category: proposalPayload.category || 'General Components',
      partCode: proposalPayload.partCode || `SP-${100 + spareParts.length + 1}`,
      partName: proposalPayload.partName,
      specification: proposalPayload.specification || '',
      compatibleProductId: proposalPayload.compatibleProductId || 'PRD-M-101',
      compatibleProductName: proposalPayload.compatibleProductName || 'General Industrial Equipment',
      uom: proposalPayload.uom || 'Pcs',
      minThreshold: Number(proposalPayload.minThreshold || 5),
      unitPrice: Number(proposalPayload.unitPrice || 1000),
      reason: proposalPayload.reason || 'Identified new spare part requirement for customer service support.',
      remarks: proposalPayload.remarks || '',
      proposedBy: proposalPayload.proposedBy || 'Service Engineer',
      proposedDate: now,
      status: 'Pending Manager Approval',
      rejectionReason: null
    };

    setData((prev) => ({
      ...prev,
      inventoryProposals: [newProposal, ...prev.inventoryProposals]
    }));
    return newProposal;
  };

  const approveInventoryProposal = (proposalId) => {
    setData((prev) => ({
      ...prev,
      inventoryProposals: prev.inventoryProposals.map((prop) =>
        prop.id === proposalId
          ? { ...prop, status: 'Pending Store Manager Approval' }
          : prop
      )
    }));
  };

  const rejectInventoryProposal = (proposalId, reason = 'Proposed item not approved by Service Manager.') => {
    setData((prev) => ({
      ...prev,
      inventoryProposals: prev.inventoryProposals.map((prop) =>
        prop.id === proposalId
          ? { ...prop, status: 'Rejected by Manager', rejectionReason: reason }
          : prop
      )
    }));
  };

  const sendProposalToStoreManager = (proposalId) => {
    setData((prev) => ({
      ...prev,
      inventoryProposals: prev.inventoryProposals.map((prop) =>
        prop.id === proposalId
          ? { ...prop, status: 'Pending Store Manager Approval' }
          : prop
      )
    }));
  };

  const storeApproveInventoryProposal = (proposalId) => {
    setData((prev) => ({
      ...prev,
      inventoryProposals: prev.inventoryProposals.map((prop) =>
        prop.id === proposalId
          ? { ...prop, status: 'Approved' }
          : prop
      )
    }));
  };

  const storeRejectInventoryProposal = (proposalId, reason = 'Store warehouse cannot stock this material.') => {
    setData((prev) => ({
      ...prev,
      inventoryProposals: prev.inventoryProposals.map((prop) =>
        prop.id === proposalId
          ? { ...prop, status: 'Rejected by Store Manager', rejectionReason: reason }
          : prop
      )
    }));
  };

  const addProposalToInventory = (proposalId) => {
    setData((prev) => {
      const prop = prev.inventoryProposals.find((p) => p.id === proposalId);
      if (!prop) return prev;

      const nextNum = 100 + prev.spareParts.length + 1;
      const newPartId = prop.partCode || `SP-${nextNum}`;

      const newPart = {
        id: newPartId,
        code: newPartId,
        name: prop.partName,
        specification: prop.specification,
        category: prop.category,
        compatibleProductId: prop.compatibleProductId,
        compatibleProductName: prop.compatibleProductName,
        uom: prop.uom || 'Pcs',
        availableQty: 10, // Initial approved stock
        reservedQty: 0,
        usedQty: 0,
        unitPrice: prop.unitPrice,
        minThreshold: prop.minThreshold,
        status: 'In Stock',
        location: 'Central Pune Store (Bin New-01)',
        description: prop.remarks
      };

      const updatedProposals = prev.inventoryProposals.map((p) =>
        p.id === proposalId ? { ...p, status: 'Added to Inventory' } : p
      );

      return {
        ...prev,
        spareParts: [newPart, ...prev.spareParts],
        inventoryProposals: updatedProposals
      };
    });
  };

  /**
   * 16G. Preventive Service Visit Scheduling from Warranty / AMC Coverage
   */
  const schedulePreventiveVisit = (coverageType, coverageId, { scheduledDate, engineerId, engineerName, startTime = '10:00 AM', expectedEndTime = '01:00 PM', remarks = '' }) => {
    const nextSchNum = 100 + schedules.length + 1;
    const newSchId = `SCH-${nextSchNum}`;
    const now = new Date().toISOString().slice(0, 10);

    setData((prev) => {
      let customerId = 'CUS-000001';
      let customerName = 'Customer';
      let productName = 'Equipment';
      let updatedWarranty = prev.warrantyRecords;
      let updatedAmc = prev.amcRecords;

      if (coverageType === 'warranty') {
        const target = prev.warrantyRecords.find((w) => w.id === coverageId);
        if (target) {
          customerId = target.customerId;
          customerName = target.customerName;
          productName = target.productName;
          updatedWarranty = prev.warrantyRecords.map((w) =>
            w.id === coverageId
              ? {
                  ...w,
                  visitsCompleted: w.visitsCompleted + 1,
                  remainingVisits: Math.max(0, (w.remainingVisits || 1) - 1),
                  nextScheduledVisit: scheduledDate
                }
              : w
          );
        }
      } else {
        const target = prev.amcRecords.find((a) => a.id === coverageId);
        if (target) {
          customerId = target.customerId;
          customerName = target.customerName;
          productName = target.productName;
          updatedAmc = prev.amcRecords.map((a) =>
            a.id === coverageId
              ? {
                  ...a,
                  visitsCompleted: a.visitsCompleted + 1,
                  remainingVisits: Math.max(0, (a.remainingVisits || 1) - 1),
                  nextScheduledMaintenance: scheduledDate
                }
              : a
          );
        }
      }

      const customer = DEMO_CUSTOMERS.find((c) => c.id === customerId) || DEMO_CUSTOMERS[0];

      const newSchedule = {
        id: newSchId,
        serviceRequestId: `${coverageType === 'warranty' ? 'WAR' : 'AMC'}-PREV-${newSchId}`,
        customerId,
        customerName,
        customerLocation: customer.address || customer.city,
        customerContact: `${customer.contactPerson} • ${customer.phone}`,
        assignedEngineerId: engineerId || 'ENG-01',
        assignedEngineerName: engineerName || 'David Chen',
        supportingEmployeeId: null,
        supportingEmployeeName: null,
        serviceCategory: 'Preventive Maintenance',
        purpose: `Periodic preventive service visit under ${coverageType.toUpperCase()} (${coverageId})`,
        scheduledDate,
        startTime,
        expectedEndTime,
        priority: 'Medium',
        status: 'Scheduled',
        progress: 0,
        hasConflict: false,
        equipmentModel: productName,
        reportedIssue: 'Periodic preventive inspection & calibration.'
      };

      return {
        ...prev,
        schedules: [newSchedule, ...prev.schedules],
        warrantyRecords: updatedWarranty,
        amcRecords: updatedAmc
      };
    });
  };

  /**
   * 16H. Finance Team Service Bill Submissions
   */
  const sendBillToFinance = (invoiceNo) => {
    setData((prev) => ({
      ...prev,
      serviceBilling: prev.serviceBilling.map((inv) =>
        inv.serviceInvoiceNo === invoiceNo
          ? { ...inv, approvalStatus: 'Pending Finance Approval' }
          : inv
      )
    }));
  };

  const financeApproveBill = (invoiceNo) => {
    setData((prev) => ({
      ...prev,
      serviceBilling: prev.serviceBilling.map((inv) =>
        inv.serviceInvoiceNo === invoiceNo
          ? { ...inv, approvalStatus: 'Approved' }
          : inv
      )
    }));
  };

  const financeRejectBill = (invoiceNo, reason = 'Finance audit detected charge discrepancy.') => {
    setData((prev) => ({
      ...prev,
      serviceBilling: prev.serviceBilling.map((inv) =>
        inv.serviceInvoiceNo === invoiceNo
          ? { ...inv, approvalStatus: 'Rejected', rejectionReason: reason }
          : inv
      )
    }));
  };

  /**
   * 17. Add Warranty Record
   */
  const addWarrantyRecord = (recordPayload) => {
    const nextNum = (warrantyRecords.length + 1).toString().padStart(3, '0');
    const newId = `WAR-2026-${nextNum}`;

    const newRecord = {
      id: newId,
      customerId: recordPayload.customerId,
      customerName: recordPayload.customerName,
      productId: recordPayload.productId,
      productName: recordPayload.productName,
      serialNumber: recordPayload.serialNumber || `SN-${Date.now().toString().slice(-6)}`,
      invoiceNumber: recordPayload.invoiceNumber || 'INV-2026-085',
      purchaseDate: recordPayload.purchaseDate,
      warrantyStartDate: recordPayload.warrantyStartDate,
      warrantyEndDate: recordPayload.warrantyEndDate,
      warrantyDuration: recordPayload.warrantyDuration || '12 Months',
      coverageType: recordPayload.coverageType || 'Standard Manufacturer Warranty',
      warrantyStatus: 'Active',
      exclusions: recordPayload.exclusions || 'Standard improper use exclusions.',
      claimHistory: 'Newly registered asset warranty.',
      remarks: recordPayload.remarks || ''
    };

    setData((prev) => ({
      ...prev,
      warrantyRecords: [newRecord, ...(prev.warrantyRecords || DEMO_WARRANTY_RECORDS)]
    }));
    return newRecord;
  };

  /**
   * 18. Register AMC Contract
   */
  const registerAmcContract = (contractPayload) => {
    const nextNum = (amcRecords.length + 1).toString().padStart(3, '0');
    const newId = `AMC-2026-${nextNum}`;
    const randCode = Math.floor(100 + Math.random() * 900);

    const newContract = {
      id: newId,
      customerId: contractPayload.customerId,
      customerName: contractPayload.customerName,
      productId: contractPayload.productId || 'PRD-M-101',
      productName: contractPayload.productName,
      contractNumber: contractPayload.contractNumber || `AMC-2026-REG${randCode}`,
      contractStartDate: contractPayload.contractStartDate,
      contractEndDate: contractPayload.contractEndDate,
      contractDuration: contractPayload.contractDuration || '12 Months',
      visitsIncluded: Number(contractPayload.visitsIncluded || 4),
      visitsCompleted: 0,
      remainingVisits: Number(contractPayload.visitsIncluded || 4),
      amcValue: Number(contractPayload.amcValue || 30000),
      amcStatus: 'Active',
      amcType: contractPayload.amcType || 'Comprehensive AMC',
      nextScheduledMaintenance: contractPayload.nextScheduledMaintenance || contractPayload.contractStartDate,
      remarks: contractPayload.remarks || 'Annual Maintenance Contract registered.'
    };

    setData((prev) => ({
      ...prev,
      amcRecords: [newContract, ...(prev.amcRecords || DEMO_AMC_RECORDS)]
    }));
    return newContract;
  };

  /**
   * 19. Renew AMC Contract
   */
  const renewAmcContract = (contractId, { extensionMonths = 12, newAmcType, additionalVisits = 4 }) => {
    setData((prev) => ({
      ...prev,
      amcRecords: (prev.amcRecords || DEMO_AMC_RECORDS).map((rec) => {
        if (rec.id === contractId) {
          const currentEnd = rec.contractEndDate ? new Date(rec.contractEndDate) : new Date();
          const newEnd = new Date(currentEnd);
          newEnd.setMonth(newEnd.getMonth() + Number(extensionMonths));
          const formattedEnd = newEnd.toISOString().slice(0, 10);

          return {
            ...rec,
            amcStatus: 'Active',
            contractEndDate: formattedEnd,
            amcType: newAmcType || rec.amcType,
            visitsIncluded: rec.visitsIncluded + Number(additionalVisits),
            remainingVisits: rec.remainingVisits + Number(additionalVisits)
          };
        }
        return rec;
      })
    }));
  };

  /**
   * 20. Reset Demo Data
   */
  const resetDemoData = () => {
    try {
      localStorage.removeItem(SERVICE_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setData({
      serviceRequests: INITIAL_SERVICE_REQUESTS,
      assignments: INITIAL_WORK_ASSIGNMENTS,
      schedules: INITIAL_SCHEDULES,
      spareParts: DEMO_SPARE_PARTS,
      sparePartRequests: DEMO_SPARE_PART_REQUESTS,
      inventoryProposals: DEMO_INVENTORY_PROPOSALS,
      stockMovements: DEMO_STOCK_MOVEMENTS,
      warrantyRecords: DEMO_WARRANTY_RECORDS,
      amcRecords: DEMO_AMC_RECORDS,
      warrantyAmcRecords: DEMO_WARRANTY_AMC,
      serviceBilling: DEMO_SERVICE_BILLING,
      serviceHistory: DEMO_SERVICE_HISTORY
    });
  };

  const value = {
    serviceRequests,
    assignments,
    schedules,
    spareParts,
    sparePartRequests,
    inventoryProposals,
    stockMovements,
    // Inventory alias
    inventory: spareParts,
    inventoryRequests: sparePartRequests,
    warrantyRecords,
    amcRecords,
    warrantyAmcRecords,
    serviceBilling,
    serviceHistory,
    customers: DEMO_CUSTOMERS,
    products: DEMO_PRODUCTS,
    salesInvoices: DEMO_SALES_INVOICES,
    engineers: DEMO_ENGINEERS,
    employees: DEMO_EMPLOYEES,
    addServiceRequest,
    acceptServiceRequest,
    rejectServiceRequest,
    acceptAsRepeatComplaint,
    updateServiceRequestStatus,
    createWorkAssignment,
    reassignAssignment,
    rescheduleAssignment,
    cancelAssignment,
    recordServiceExecution,
    createServiceInvoice,
    approveServiceBill,
    rejectServiceBill,
    issueServiceBill,
    sendBillToFinance,
    financeApproveBill,
    financeRejectBill,
    recordServicePayment,
    updateSparePartStock,
    addSparePart,
    editSparePart,
    addSparePartRequest,
    approveSparePartRequest,
    rejectSparePartRequest,
    issueSparePart,
    markPartCollected,
    recordPartConsumption,
    updateDeliveryStatus,
    recordDirectStockUsage,
    proposeInventoryItem,
    approveInventoryProposal,
    rejectInventoryProposal,
    sendProposalToStoreManager,
    storeApproveInventoryProposal,
    storeRejectInventoryProposal,
    addProposalToInventory,
    schedulePreventiveVisit,
    renewWarrantyAmc,
    addWarrantyRecord,
    registerAmcContract,
    renewAmcContract,
    resetDemoData
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
